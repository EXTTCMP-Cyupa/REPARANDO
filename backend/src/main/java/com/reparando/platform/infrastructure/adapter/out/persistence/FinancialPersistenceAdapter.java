package com.reparando.platform.infrastructure.adapter.out.persistence;

import com.reparando.platform.domain.model.DepositReceipt;
import com.reparando.platform.domain.model.DepositStatus;
import com.reparando.platform.domain.model.LeadCharge;
import com.reparando.platform.domain.model.WorkerAccount;
import com.reparando.platform.domain.port.out.DepositReceiptRepositoryPort;
import com.reparando.platform.domain.port.out.LeadChargeRepositoryPort;
import com.reparando.platform.domain.port.out.WorkerAccountRepositoryPort;
import com.reparando.platform.infrastructure.adapter.out.persistence.entity.DepositReceiptEntity;
import com.reparando.platform.infrastructure.adapter.out.persistence.entity.WorkerAccountEntity;
import com.reparando.platform.infrastructure.adapter.out.persistence.repository.DepositReceiptR2dbcRepository;
import com.reparando.platform.infrastructure.adapter.out.persistence.repository.WorkerAccountR2dbcRepository;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class FinancialPersistenceAdapter implements WorkerAccountRepositoryPort, LeadChargeRepositoryPort, DepositReceiptRepositoryPort {

    private final WorkerAccountR2dbcRepository workerRepo;
    private final DepositReceiptR2dbcRepository depositRepo;
    private final DatabaseClient databaseClient;

    public FinancialPersistenceAdapter(
        WorkerAccountR2dbcRepository workerRepo,
        DepositReceiptR2dbcRepository depositRepo,
        DatabaseClient databaseClient
    ) {
        this.workerRepo = workerRepo;
        this.depositRepo = depositRepo;
        this.databaseClient = databaseClient;
    }

    @Override
    public Mono<WorkerAccount> findWorkerById(UUID workerId) {
        return workerRepo.findById(workerId).map(this::toDomain);
    }

    @Override
    public Mono<WorkerAccount> save(WorkerAccount workerAccount) {
        return workerRepo.save(toEntity(workerAccount)).map(this::toDomain);
    }

    @Override
    public Mono<LeadCharge> save(LeadCharge leadCharge) {
        return databaseClient.sql("""
                INSERT INTO lead_charge(id, worker_id, client_id, amount, charged_at, source)
                VALUES (:id, :workerId, :clientId, :amount, :chargedAt, :source)
                """)
            .bind("id", leadCharge.id())
            .bind("workerId", leadCharge.workerId())
            .bind("clientId", leadCharge.clientId())
            .bind("amount", leadCharge.amount())
            .bind("chargedAt", leadCharge.chargedAt())
            .bind("source", leadCharge.source())
            .fetch()
            .rowsUpdated()
            .thenReturn(leadCharge);
    }

    @Override
    public Mono<DepositReceipt> save(DepositReceipt receipt) {
        var spec = databaseClient.sql("""
                INSERT INTO deposit_receipt(id, worker_id, amount, image_path, status, created_at, reviewed_by)
                VALUES (:id, :workerId, :amount, :imagePath, :status, :createdAt, :reviewedBy)
                ON CONFLICT (id) DO UPDATE
                SET amount = EXCLUDED.amount,
                    image_path = EXCLUDED.image_path,
                    status = EXCLUDED.status,
                    reviewed_by = EXCLUDED.reviewed_by
                """)
            .bind("id", receipt.id())
            .bind("workerId", receipt.workerId())
            .bind("amount", receipt.amount())
            .bind("imagePath", receipt.imagePath())
            .bind("status", receipt.status().name())
            .bind("createdAt", receipt.createdAt());

        if (receipt.reviewedBy() == null) {
            spec = spec.bindNull("reviewedBy", UUID.class);
        } else {
            spec = spec.bind("reviewedBy", receipt.reviewedBy());
        }

        return spec.fetch()
            .rowsUpdated()
            .thenReturn(receipt);
    }

    @Override
    public Mono<DepositReceipt> findById(UUID id) {
        return depositRepo.findById(id).map(this::toDomain);
    }

    @Override
    public Flux<DepositReceipt> findPending() {
        return depositRepo.findPending().map(this::toDomain);
    }

    private WorkerAccountEntity toEntity(WorkerAccount source) {
        return new WorkerAccountEntity(
            source.id(),
            source.fullName(),
            source.email(),
            source.balance(),
            source.blocked()
        );
    }

    private WorkerAccount toDomain(WorkerAccountEntity source) {
        return new WorkerAccount(
            source.id(),
            source.fullName(),
            source.email(),
            source.balance(),
            source.blocked()
        );
    }

    private DepositReceipt toDomain(DepositReceiptEntity source) {
        return new DepositReceipt(
            source.id(),
            source.workerId(),
            source.amount(),
            source.imagePath(),
            DepositStatus.valueOf(source.status()),
            source.createdAt(),
            source.reviewedBy()
        );
    }
}
