package com.reparando.platform.infrastructure.adapter.out.persistence.repository;

import com.reparando.platform.infrastructure.adapter.out.persistence.entity.DepositReceiptEntity;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

import java.util.UUID;

public interface DepositReceiptR2dbcRepository extends ReactiveCrudRepository<DepositReceiptEntity, UUID> {

    @Query("SELECT * FROM deposit_receipt WHERE status = 'PENDING' ORDER BY created_at DESC")
    Flux<DepositReceiptEntity> findPending();
}
