package com.reparando.platform.infrastructure.adapter.out.persistence.repository;

import com.reparando.platform.infrastructure.adapter.out.persistence.entity.ServiceNeedEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

import java.util.UUID;

public interface ServiceNeedR2dbcRepository extends ReactiveCrudRepository<ServiceNeedEntity, UUID> {
	Flux<ServiceNeedEntity> findAllByOrderByCreatedAtDesc();
	Flux<ServiceNeedEntity> findByStatusOrderByCreatedAtDesc(String status);
	Flux<ServiceNeedEntity> findByClientIdOrderByCreatedAtDesc(UUID clientId);
}
