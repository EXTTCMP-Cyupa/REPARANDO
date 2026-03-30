package com.reparando.platform.infrastructure.adapter.out.persistence.repository;

import com.reparando.platform.infrastructure.adapter.out.persistence.entity.LeadChargeEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import java.util.UUID;

public interface LeadChargeR2dbcRepository extends ReactiveCrudRepository<LeadChargeEntity, UUID> {
}
