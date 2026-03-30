package com.reparando.platform.domain.port.out;

import com.reparando.platform.domain.model.BidProposal;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface BidProposalRepositoryPort {
    Mono<BidProposal> save(BidProposal bidProposal);
    Flux<BidProposal> findByNeedId(UUID needId);
    Mono<BidProposal> findBidById(UUID bidId);
}
