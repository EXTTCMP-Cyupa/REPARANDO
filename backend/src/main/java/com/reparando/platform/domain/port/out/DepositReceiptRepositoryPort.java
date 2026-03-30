package com.reparando.platform.domain.port.out;

import com.reparando.platform.domain.model.DepositReceipt;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface DepositReceiptRepositoryPort {
    Mono<DepositReceipt> save(DepositReceipt receipt);
    Mono<DepositReceipt> findById(UUID id);
    Flux<DepositReceipt> findPending();
}
