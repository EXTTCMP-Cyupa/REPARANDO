package com.reparando.platform.infrastructure.adapter.out.persistence.repository;

import com.reparando.platform.infrastructure.adapter.out.persistence.entity.WorkerAccountEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import java.util.UUID;

public interface WorkerAccountR2dbcRepository extends ReactiveCrudRepository<WorkerAccountEntity, UUID> {
}
