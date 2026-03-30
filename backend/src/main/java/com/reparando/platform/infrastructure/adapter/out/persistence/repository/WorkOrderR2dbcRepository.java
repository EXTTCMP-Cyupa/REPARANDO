package com.reparando.platform.infrastructure.adapter.out.persistence.repository;

import com.reparando.platform.infrastructure.adapter.out.persistence.entity.WorkOrderEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

import java.util.UUID;

public interface WorkOrderR2dbcRepository extends ReactiveCrudRepository<WorkOrderEntity, UUID> {
	Flux<WorkOrderEntity> findByWorkerIdOrderByIdDesc(UUID workerId);
	Flux<WorkOrderEntity> findByClientIdOrderByIdDesc(UUID clientId);
}
