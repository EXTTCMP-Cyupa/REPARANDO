package com.reparando.platform.infrastructure.adapter.out.persistence.repository;

import com.reparando.platform.infrastructure.adapter.out.persistence.entity.WorkMaterialEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

import java.util.UUID;

public interface WorkMaterialR2dbcRepository extends ReactiveCrudRepository<WorkMaterialEntity, UUID> {
    Flux<WorkMaterialEntity> findByWorkOrderIdOrderByCreatedAtDesc(UUID workOrderId);
}