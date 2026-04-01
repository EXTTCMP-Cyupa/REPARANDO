package com.reparando.platform.infrastructure.adapter.out.persistence;

import com.reparando.platform.domain.model.LedgerEntry;
import com.reparando.platform.domain.model.LedgerEntryType;
import com.reparando.platform.domain.port.out.LedgerEntryRepositoryPort;
import com.reparando.platform.infrastructure.adapter.out.persistence.entity.FinancialLedgerEntryEntity;
import com.reparando.platform.infrastructure.adapter.out.persistence.repository.FinancialLedgerEntryR2dbcRepository;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class LedgerPersistenceAdapter implements LedgerEntryRepositoryPort {

    private final FinancialLedgerEntryR2dbcRepository ledgerRepo;
    private final DatabaseClient databaseClient;

    public LedgerPersistenceAdapter(
        FinancialLedgerEntryR2dbcRepository ledgerRepo,
        DatabaseClient databaseClient
    ) {
        this.ledgerRepo = ledgerRepo;
        this.databaseClient = databaseClient;
    }

    @Override
    public Mono<LedgerEntry> save(LedgerEntry entry) {
        var spec = databaseClient.sql("""
                INSERT INTO financial_ledger_entry(id, worker_id, entry_type, amount, description, reference_entry_id, external_reference, created_at, created_by)
                VALUES (:id, :workerId, :entryType, :amount, :description, :referenceEntryId, :externalReference, :createdAt, :createdBy)
                ON CONFLICT (id) DO UPDATE
                SET entry_type = EXCLUDED.entry_type,
                    amount = EXCLUDED.amount,
                    description = EXCLUDED.description,
                    reference_entry_id = EXCLUDED.reference_entry_id,
                    external_reference = EXCLUDED.external_reference,
                    created_by = EXCLUDED.created_by
                """)
            .bind("id", entry.id())
            .bind("workerId", entry.workerId())
            .bind("entryType", entry.entryType().name())
            .bind("amount", entry.amount())
            .bind("description", entry.description())
            .bind("createdAt", entry.createdAt())
            .bind("createdBy", entry.createdBy());

        if (entry.referenceEntryId() == null) {
            spec = spec.bindNull("referenceEntryId", UUID.class);
        } else {
            spec = spec.bind("referenceEntryId", entry.referenceEntryId());
        }

        if (entry.externalReference() == null || entry.externalReference().isBlank()) {
            spec = spec.bindNull("externalReference", String.class);
        } else {
            spec = spec.bind("externalReference", entry.externalReference());
        }

        return spec.fetch()
            .rowsUpdated()
            .thenReturn(entry);
    }

    @Override
    public Mono<LedgerEntry> findById(UUID entryId) {
        return ledgerRepo.findById(entryId).map(this::toDomain);
    }

    @Override
    public Flux<LedgerEntry> findByWorkerId(UUID workerId) {
        return ledgerRepo.findByWorkerIdOrderByCreatedAtDesc(workerId).map(this::toDomain);
    }

    @Override
    public Mono<LedgerEntry> findRefundByReferenceEntryId(UUID referenceEntryId) {
        return ledgerRepo.findByReferenceEntryIdAndEntryType(referenceEntryId, LedgerEntryType.REFUND.name())
            .map(this::toDomain);
    }

    private LedgerEntry toDomain(FinancialLedgerEntryEntity source) {
        return new LedgerEntry(
            source.id(),
            source.workerId(),
            LedgerEntryType.valueOf(source.entryType()),
            source.amount(),
            source.description(),
            source.referenceEntryId(),
            source.externalReference(),
            source.createdAt(),
            source.createdBy()
        );
    }
}
