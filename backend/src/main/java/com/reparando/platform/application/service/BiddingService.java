package com.reparando.platform.application.service;

import com.reparando.platform.domain.model.BidProposal;
import com.reparando.platform.domain.model.ServiceNeed;
import com.reparando.platform.domain.port.in.BiddingUseCase;
import com.reparando.platform.domain.port.in.FinancialManagementUseCase;
import com.reparando.platform.domain.port.out.BidProposalRepositoryPort;
import com.reparando.platform.domain.port.out.ServiceNeedRepositoryPort;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class BiddingService implements BiddingUseCase {

    private final ServiceNeedRepositoryPort serviceNeedRepository;
    private final BidProposalRepositoryPort bidProposalRepository;
    private final FinancialManagementUseCase financialManagementUseCase;

    public BiddingService(
        ServiceNeedRepositoryPort serviceNeedRepository,
        BidProposalRepositoryPort bidProposalRepository,
        FinancialManagementUseCase financialManagementUseCase
    ) {
        this.serviceNeedRepository = serviceNeedRepository;
        this.bidProposalRepository = bidProposalRepository;
        this.financialManagementUseCase = financialManagementUseCase;
    }

    @Override
    public Mono<ServiceNeed> publishNeed(UUID clientId, String title, String description, String category) {
        ServiceNeed need = new ServiceNeed(UUID.randomUUID(), clientId, title, description, category, OffsetDateTime.now());
        return serviceNeedRepository.save(need);
    }

    @Override
    public Mono<BidProposal> submitBid(UUID needId, UUID workerId, BigDecimal laborCost, String summary) {
        BidProposal proposal = new BidProposal(UUID.randomUUID(), needId, workerId, laborCost, summary, OffsetDateTime.now());
        return bidProposalRepository.save(proposal);
    }

    @Override
    public Flux<ServiceNeed> listNeeds() {
        return serviceNeedRepository.findAll();
    }

    @Override
    public Flux<ServiceNeed> listNeedsByClient(UUID clientId) {
        return serviceNeedRepository.findByClientId(clientId);
    }

    @Override
    public Flux<BidProposal> listBids(UUID needId) {
        return bidProposalRepository.findByNeedId(needId);
    }

    @Override
    public Mono<BidProposal> selectBid(UUID needId, UUID bidId, UUID clientId) {
        return serviceNeedRepository.findNeedById(needId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Need not found for client")))
            .filter(need -> need.clientId().equals(clientId))
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Need not found for client")))
            .then(bidProposalRepository.findBidById(bidId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Bid not found"))))
            .filter(proposal -> proposal.needId().equals(needId))
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Bid not found")))
            .flatMap(proposal -> financialManagementUseCase
                .chargeLead(proposal.workerId(), clientId, "BIDDING_SELECTION")
                .thenReturn(proposal));
    }
}
