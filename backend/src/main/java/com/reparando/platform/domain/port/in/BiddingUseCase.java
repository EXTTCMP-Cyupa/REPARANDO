package com.reparando.platform.domain.port.in;

import com.reparando.platform.domain.model.BidProposal;
import com.reparando.platform.domain.model.ServiceNeed;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.UUID;

public interface BiddingUseCase {
    Mono<ServiceNeed> publishNeed(UUID clientId, String title, String description, String category);
    Mono<BidProposal> submitBid(UUID needId, UUID workerId, BigDecimal laborCost, String summary);
    Flux<ServiceNeed> listNeeds();
    Flux<ServiceNeed> listNeedsByClient(UUID clientId);
    Flux<BidProposal> listBids(UUID needId);
    Mono<BidProposal> selectBid(UUID needId, UUID bidId, UUID clientId);
}
