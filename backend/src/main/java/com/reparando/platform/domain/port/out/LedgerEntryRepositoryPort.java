package com.reparando.platform.domain.port.out;

import com.reparando.platform.domain.model.LedgerEntry;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface LedgerEntryRepositoryPort {
    Mono<LedgerEntry> save(LedgerEntry entry);
    Mono<LedgerEntry> findById(UUID entryId);
    Flux<LedgerEntry> findByWorkerId(UUID workerId);
    Mono<LedgerEntry> findRefundByReferenceEntryId(UUID referenceEntryId);
}
