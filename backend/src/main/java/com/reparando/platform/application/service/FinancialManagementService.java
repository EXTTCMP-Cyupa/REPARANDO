package com.reparando.platform.application.service;

import com.reparando.platform.domain.model.DepositReceipt;
import com.reparando.platform.domain.model.DepositStatus;
import com.reparando.platform.domain.model.LeadCharge;
import com.reparando.platform.domain.model.WorkerAccount;
import com.reparando.platform.domain.port.in.FinancialManagementUseCase;
import com.reparando.platform.domain.port.out.BusinessPolicyRepositoryPort;
import com.reparando.platform.domain.port.out.DepositReceiptRepositoryPort;
import com.reparando.platform.domain.port.out.LeadChargeRepositoryPort;
import com.reparando.platform.domain.port.out.WorkerAccountRepositoryPort;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class FinancialManagementService implements FinancialManagementUseCase {

    private final WorkerAccountRepositoryPort workerAccountRepository;
    private final LeadChargeRepositoryPort leadChargeRepository;
    private final DepositReceiptRepositoryPort depositReceiptRepository;
    private final BusinessPolicyRepositoryPort businessPolicyRepository;

    public FinancialManagementService(
        WorkerAccountRepositoryPort workerAccountRepository,
        LeadChargeRepositoryPort leadChargeRepository,
        DepositReceiptRepositoryPort depositReceiptRepository,
        BusinessPolicyRepositoryPort businessPolicyRepository
    ) {
        this.workerAccountRepository = workerAccountRepository;
        this.leadChargeRepository = leadChargeRepository;
        this.depositReceiptRepository = depositReceiptRepository;
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
                        .then(workerAccountRepository.save(updated));
                })
            );
    }

    @Override
    public Mono<DepositReceipt> submitDepositReceipt(UUID workerId, java.math.BigDecimal amount, String imagePath) {
        DepositReceipt receipt = new DepositReceipt(
            UUID.randomUUID(),
            workerId,
            amount,
            imagePath,
            DepositStatus.PENDING,
            OffsetDateTime.now(),
            null
        );
        return depositReceiptRepository.save(receipt);
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
}
