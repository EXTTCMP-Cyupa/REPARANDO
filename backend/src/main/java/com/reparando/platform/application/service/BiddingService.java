package com.reparando.platform.application.service;

import com.reparando.platform.domain.model.BidProposal;
import com.reparando.platform.domain.model.ServiceNeed;
import com.reparando.platform.domain.model.ServiceNeedStatus;
import com.reparando.platform.domain.port.in.BiddingUseCase;
import com.reparando.platform.domain.port.in.FinancialManagementUseCase;
import com.reparando.platform.domain.port.in.WorkWorkflowUseCase;
import com.reparando.platform.domain.port.out.BidProposalRepositoryPort;
import com.reparando.platform.domain.port.out.ServiceNeedRepositoryPort;
import com.reparando.platform.domain.port.out.WorkerAccountRepositoryPort;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class BiddingService implements BiddingUseCase {

    private static final long NEED_EXPIRATION_DAYS = 7;

    private final ServiceNeedRepositoryPort serviceNeedRepository;
    private final BidProposalRepositoryPort bidProposalRepository;
    private final FinancialManagementUseCase financialManagementUseCase;
    private final WorkWorkflowUseCase workWorkflowUseCase;
    private final WorkerAccountRepositoryPort workerAccountRepository;

    public BiddingService(
        ServiceNeedRepositoryPort serviceNeedRepository,
        BidProposalRepositoryPort bidProposalRepository,
        FinancialManagementUseCase financialManagementUseCase,
        WorkWorkflowUseCase workWorkflowUseCase,
        WorkerAccountRepositoryPort workerAccountRepository
    ) {
        this.serviceNeedRepository = serviceNeedRepository;
        this.bidProposalRepository = bidProposalRepository;
        this.financialManagementUseCase = financialManagementUseCase;
        this.workWorkflowUseCase = workWorkflowUseCase;
        this.workerAccountRepository = workerAccountRepository;
    }

    @Override
    public Mono<ServiceNeed> publishNeed(UUID clientId, String title, String description, String category) {
        ServiceNeed need = new ServiceNeed(
            UUID.randomUUID(),
            clientId,
            title,
            description,
            category,
            OffsetDateTime.now(),
            ServiceNeedStatus.OPEN,
            null,
            null,
            null,
            null
        );
        return serviceNeedRepository.save(need);
    }

    @Override
    public Mono<BidProposal> submitBid(UUID needId, UUID workerId, BigDecimal laborCost, String summary) {
        if (laborCost == null || laborCost.compareTo(BigDecimal.ZERO) <= 0) {
            return Mono.error(new IllegalArgumentException("Labor cost must be greater than zero"));
        }
        if (summary == null || summary.isBlank()) {
            return Mono.error(new IllegalArgumentException("Bid summary is required"));
        }

        return serviceNeedRepository.findNeedById(needId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Need not found")))
            .filter(need -> need.status() == ServiceNeedStatus.OPEN)
            .switchIfEmpty(Mono.error(new IllegalStateException("Need is no longer open for proposals")))
            .filter(this::isNeedOpenForBidding)
            .switchIfEmpty(Mono.error(new IllegalStateException("Need expired for new proposals")))
            .flatMap(need -> bidProposalRepository.findByNeedId(needId)
                .any(existing -> existing.workerId().equals(workerId))
                .flatMap(exists -> {
                    if (exists) {
                        return Mono.error(new IllegalStateException("Worker already submitted a proposal for this need"));
                    }
                    return Mono.just(need);
                })
            )
            .then(workerAccountRepository.findWorkerById(workerId))
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Worker not found")))
            .filter(worker -> !worker.blocked())
            .switchIfEmpty(Mono.error(new IllegalStateException("Worker is blocked due to trust credit limit")))
            .flatMap(worker -> {
                BidProposal proposal = new BidProposal(UUID.randomUUID(), needId, workerId, laborCost, summary.trim(), OffsetDateTime.now());
                return bidProposalRepository.save(proposal);
            });
    }

    @Override
    public Flux<ServiceNeed> listNeeds() {
        return serviceNeedRepository.findByStatus(ServiceNeedStatus.OPEN);
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
            .filter(need -> need.status() == ServiceNeedStatus.OPEN)
            .switchIfEmpty(Mono.error(new IllegalStateException("Need already assigned")))
            .filter(this::isNeedOpenForBidding)
            .switchIfEmpty(Mono.error(new IllegalStateException("Need expired and cannot be assigned")))
            .flatMap(need -> bidProposalRepository.findBidById(bidId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Bid not found")))
                .filter(proposal -> proposal.needId().equals(needId))
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Bid not found")))
                .flatMap(proposal -> financialManagementUseCase
                    .chargeLead(proposal.workerId(), clientId, "BIDDING_SELECTION")
                    .then(workWorkflowUseCase.createWorkOrder(clientId, proposal.workerId(), need.description(), need.category()))
                    .flatMap(workOrder -> serviceNeedRepository.save(new ServiceNeed(
                        need.id(),
                        need.clientId(),
                        need.title(),
                        need.description(),
                        need.category(),
                        need.createdAt(),
                        ServiceNeedStatus.ASSIGNED,
                        proposal.id(),
                        proposal.workerId(),
                        workOrder.id(),
                        OffsetDateTime.now()
                    )))
                    .thenReturn(proposal)));
    }

    private boolean isNeedOpenForBidding(ServiceNeed need) {
        return need.createdAt() != null && need.createdAt().plusDays(NEED_EXPIRATION_DAYS).isAfter(OffsetDateTime.now());
    }
}
