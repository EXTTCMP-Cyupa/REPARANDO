package com.reparando.platform.infrastructure.adapter.out.persistence.repository;

import com.reparando.platform.infrastructure.adapter.out.persistence.entity.BidProposalEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

import java.util.UUID;

public interface BidProposalR2dbcRepository extends ReactiveCrudRepository<BidProposalEntity, UUID> {
    Flux<BidProposalEntity> findByNeedIdOrderByCreatedAtAsc(UUID needId);
}
