package com.reparando.platform.infrastructure.adapter.out.persistence.repository;

import com.reparando.platform.infrastructure.adapter.out.persistence.entity.FinancialLedgerEntryEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface FinancialLedgerEntryR2dbcRepository extends ReactiveCrudRepository<FinancialLedgerEntryEntity, UUID> {
    Flux<FinancialLedgerEntryEntity> findByWorkerIdOrderByCreatedAtDesc(UUID workerId);
    Mono<FinancialLedgerEntryEntity> findByReferenceEntryIdAndEntryType(UUID referenceEntryId, String entryType);
}
