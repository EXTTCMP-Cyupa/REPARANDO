package com.reparando.platform.application.service;

import com.reparando.platform.domain.model.DepositReceipt;
import com.reparando.platform.domain.model.DepositStatus;
import com.reparando.platform.domain.model.LedgerEntry;
import com.reparando.platform.domain.model.LedgerEntryType;
import com.reparando.platform.domain.model.LeadCharge;
import com.reparando.platform.domain.model.PaymentMethod;
import com.reparando.platform.domain.model.WorkerAccount;
import com.reparando.platform.domain.port.in.FinancialManagementUseCase;
import com.reparando.platform.domain.port.out.BusinessPolicyRepositoryPort;
import com.reparando.platform.domain.port.out.DepositReceiptRepositoryPort;
import com.reparando.platform.domain.port.out.LedgerEntryRepositoryPort;
import com.reparando.platform.domain.port.out.LeadChargeRepositoryPort;
import com.reparando.platform.domain.port.out.WorkerAccountRepositoryPort;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class FinancialManagementService implements FinancialManagementUseCase {

    private final WorkerAccountRepositoryPort workerAccountRepository;
    private final LeadChargeRepositoryPort leadChargeRepository;
    private final DepositReceiptRepositoryPort depositReceiptRepository;
    private final LedgerEntryRepositoryPort ledgerEntryRepository;
    private final BusinessPolicyRepositoryPort businessPolicyRepository;

    public FinancialManagementService(
        WorkerAccountRepositoryPort workerAccountRepository,
        LeadChargeRepositoryPort leadChargeRepository,
        DepositReceiptRepositoryPort depositReceiptRepository,
        LedgerEntryRepositoryPort ledgerEntryRepository,
        BusinessPolicyRepositoryPort businessPolicyRepository
    ) {
        this.workerAccountRepository = workerAccountRepository;
        this.leadChargeRepository = leadChargeRepository;
        this.depositReceiptRepository = depositReceiptRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.businessPolicyRepository = businessPolicyRepository;
    }

    @Override
    public Mono<WorkerAccount> getWorkerAccount(UUID workerId) {
        return workerAccountRepository.findWorkerById(workerId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Worker not found")));
    }

    @Override
    public Mono<WorkerAccount> chargeLead(UUID workerId, UUID clientId, String source) {
        return businessPolicyRepository.getCurrent()
            .flatMap(policy -> workerAccountRepository.findWorkerById(workerId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Worker not found")))
                .flatMap(worker -> {
                    if (worker.blocked()) {
                        return Mono.error(new IllegalStateException("Worker is blocked due to trust credit limit"));
                    }

                    WorkerAccount updated = worker.applyLeadCharge(
                        policy.leadCost(),
                        policy.trustCreditLimit()
                    );

                    LeadCharge charge = new LeadCharge(
                        UUID.randomUUID(),
                        workerId,
                        clientId,
                        policy.leadCost(),
                        OffsetDateTime.now(),
                        source
                    );

                    return leadChargeRepository.save(charge)
                        .then(workerAccountRepository.save(updated))
                        .flatMap(savedWorker -> ledgerEntryRepository.save(new LedgerEntry(
                            UUID.randomUUID(),
                            workerId,
                            LedgerEntryType.LEAD_CHARGE,
                            policy.leadCost().negate(),
                            "Lead charge: " + source,
                            null,
                            charge.id().toString(),
                            OffsetDateTime.now(),
                            clientId
                        )).thenReturn(savedWorker));
                })
            );
    }

    @Override
    public Mono<DepositReceipt> submitDepositReceipt(UUID workerId, BigDecimal amount, PaymentMethod paymentMethod, String imagePath) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return Mono.error(new IllegalArgumentException("Deposit amount must be greater than zero"));
        }
        if (paymentMethod == null) {
            return Mono.error(new IllegalArgumentException("Payment method is required"));
        }
        if (imagePath == null || imagePath.isBlank()) {
            return Mono.error(new IllegalArgumentException("Deposit image path is required"));
        }

        return workerAccountRepository.findWorkerById(workerId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Worker not found")))
            .flatMap(worker -> {
                DepositReceipt receipt = new DepositReceipt(
                    UUID.randomUUID(),
                    workerId,
                    amount,
                    paymentMethod,
                    imagePath.trim(),
                    DepositStatus.PENDING,
                    OffsetDateTime.now(),
                    null
                );
                return depositReceiptRepository.save(receipt);
            });
    }

    @Override
    public Mono<DepositReceipt> approveDeposit(UUID depositId, UUID adminId) {
        return depositReceiptRepository.findById(depositId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Deposit not found")))
            .flatMap(receipt -> {
                if (receipt.status() != DepositStatus.PENDING) {
                    return Mono.error(new IllegalStateException("Only pending deposits can be approved"));
                }

                DepositReceipt approved = receipt.approve(adminId);
                return depositReceiptRepository.save(approved)
                    .flatMap(saved -> businessPolicyRepository.getCurrent()
                        .flatMap(policy -> workerAccountRepository.findWorkerById(saved.workerId())
                            .switchIfEmpty(Mono.error(new IllegalArgumentException("Worker not found")))
                            .flatMap(worker -> workerAccountRepository.save(
                                worker.applyApprovedDeposit(saved.amount(), policy.trustCreditLimit())
                            ))
                            .flatMap(savedWorker -> ledgerEntryRepository.save(new LedgerEntry(
                                UUID.randomUUID(),
                                saved.workerId(),
                                LedgerEntryType.DEPOSIT_APPROVED,
                                saved.amount(),
                                "Approved deposit",
                                null,
                                saved.id().toString(),
                                OffsetDateTime.now(),
                                adminId
                            )).thenReturn(savedWorker))
                            .thenReturn(saved)
                        )
                    );
            });
    }

    @Override
    public Mono<DepositReceipt> rejectDeposit(UUID depositId, UUID adminId) {
        return depositReceiptRepository.findById(depositId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Deposit not found")))
            .flatMap(receipt -> {
                if (receipt.status() != DepositStatus.PENDING) {
                    return Mono.error(new IllegalStateException("Only pending deposits can be rejected"));
                }

                DepositReceipt rejected = receipt.reject(adminId);
                return depositReceiptRepository.save(rejected);
            });
    }

    @Override
    public Flux<DepositReceipt> listPendingDeposits() {
        return depositReceiptRepository.findPending();
    }

    @Override
    public Flux<DepositReceipt> listWorkerDeposits(UUID workerId) {
        return workerAccountRepository.findWorkerById(workerId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Worker not found")))
            .thenMany(depositReceiptRepository.findByWorkerId(workerId));
    }

    @Override
    public Flux<LedgerEntry> listWorkerLedger(UUID workerId) {
        return workerAccountRepository.findWorkerById(workerId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Worker not found")))
            .thenMany(ledgerEntryRepository.findByWorkerId(workerId));
    }

    @Override
    public Mono<LedgerEntry> createAdjustment(UUID workerId, BigDecimal amount, String reason, UUID adminId) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            return Mono.error(new IllegalArgumentException("Adjustment amount must be different from zero"));
        }
        if (reason == null || reason.isBlank()) {
            return Mono.error(new IllegalArgumentException("Adjustment reason is required"));
        }

        return businessPolicyRepository.getCurrent()
            .flatMap(policy -> workerAccountRepository.findWorkerById(workerId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Worker not found")))
                .flatMap(worker -> {
                    WorkerAccount updated = new WorkerAccount(
                        worker.id(),
                        worker.fullName(),
                        worker.email(),
                        worker.balance().add(amount),
                        worker.balance().add(amount).compareTo(policy.trustCreditLimit()) <= 0
                    );

                    LedgerEntryType type = amount.compareTo(BigDecimal.ZERO) > 0
                        ? LedgerEntryType.ADJUSTMENT_CREDIT
                        : LedgerEntryType.ADJUSTMENT_DEBIT;

                    LedgerEntry entry = new LedgerEntry(
                        UUID.randomUUID(),
                        workerId,
                        type,
                        amount,
                        reason.trim(),
                        null,
                        null,
                        OffsetDateTime.now(),
                        adminId
                    );

                    return workerAccountRepository.save(updated)
                        .then(ledgerEntryRepository.save(entry));
                })
            );
    }

    @Override
    public Mono<LedgerEntry> refundLedgerEntry(UUID entryId, String reason, UUID adminId) {
        return ledgerEntryRepository.findById(entryId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Ledger entry not found")))
            .flatMap(original -> {
                if (original.entryType() == LedgerEntryType.REFUND) {
                    return Mono.error(new IllegalStateException("Refund cannot target another refund"));
                }
                return ledgerEntryRepository.findRefundByReferenceEntryId(entryId)
                    .flatMap(existing -> Mono.<LedgerEntry>error(new IllegalStateException("Entry already refunded")))
                    .switchIfEmpty(Mono.defer(() -> applyRefund(original, reason, adminId)));
            });
    }

    private Mono<LedgerEntry> applyRefund(LedgerEntry original, String reason, UUID adminId) {
        BigDecimal refundAmount = original.amount().negate();
        String detail = (reason == null || reason.isBlank())
            ? "Refund for entry " + original.id()
            : reason.trim();

        return businessPolicyRepository.getCurrent()
            .flatMap(policy -> workerAccountRepository.findWorkerById(original.workerId())
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Worker not found")))
                .flatMap(worker -> {
                    WorkerAccount updated = new WorkerAccount(
                        worker.id(),
                        worker.fullName(),
                        worker.email(),
                        worker.balance().add(refundAmount),
                        worker.balance().add(refundAmount).compareTo(policy.trustCreditLimit()) <= 0
                    );

                    LedgerEntry refund = new LedgerEntry(
                        UUID.randomUUID(),
                        original.workerId(),
                        LedgerEntryType.REFUND,
                        refundAmount,
                        detail,
                        original.id(),
                        original.externalReference(),
                        OffsetDateTime.now(),
                        adminId
                    );

                    return workerAccountRepository.save(updated)
                        .then(ledgerEntryRepository.save(refund));
                })
            );
    }
}
