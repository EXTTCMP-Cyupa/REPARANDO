package com.reparando.platform.infrastructure.adapter.out.persistence.repository;

import com.reparando.platform.infrastructure.adapter.out.persistence.entity.ProfessionalProfileEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import java.util.UUID;

public interface ProfessionalProfileR2dbcRepository extends ReactiveCrudRepository<ProfessionalProfileEntity, UUID> {
}
