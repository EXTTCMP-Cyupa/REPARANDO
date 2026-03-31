package com.reparando.platform.infrastructure.adapter.out.persistence;

import com.reparando.platform.domain.model.BidProposal;
import com.reparando.platform.domain.model.ServiceNeed;
import com.reparando.platform.domain.model.ServiceNeedStatus;
import com.reparando.platform.domain.port.out.BidProposalRepositoryPort;
import com.reparando.platform.domain.port.out.ServiceNeedRepositoryPort;
import com.reparando.platform.infrastructure.adapter.out.persistence.entity.BidProposalEntity;
import com.reparando.platform.infrastructure.adapter.out.persistence.entity.ServiceNeedEntity;
import com.reparando.platform.infrastructure.adapter.out.persistence.repository.BidProposalR2dbcRepository;
import com.reparando.platform.infrastructure.adapter.out.persistence.repository.ServiceNeedR2dbcRepository;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.r2dbc.core.DatabaseClient.GenericExecuteSpec;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.UUID;

@Component
public class BiddingPersistenceAdapter implements ServiceNeedRepositoryPort, BidProposalRepositoryPort {

    private final ServiceNeedR2dbcRepository serviceNeedRepository;
    private final BidProposalR2dbcRepository bidProposalRepository;
    private final DatabaseClient databaseClient;

    public BiddingPersistenceAdapter(
        ServiceNeedR2dbcRepository serviceNeedRepository,
        BidProposalR2dbcRepository bidProposalRepository,
        DatabaseClient databaseClient
    ) {
        this.serviceNeedRepository = serviceNeedRepository;
        this.bidProposalRepository = bidProposalRepository;
        this.databaseClient = databaseClient;
    }

    @Override
    public Mono<ServiceNeed> save(ServiceNeed need) {
        GenericExecuteSpec spec = databaseClient.sql("""
                INSERT INTO service_need(id, client_id, title, description, category, created_at, status, selected_bid_id, selected_worker_id, assigned_work_order_id, assigned_at)
                VALUES (:id, :clientId, :title, :description, :category, :createdAt, :status, :selectedBidId, :selectedWorkerId, :assignedWorkOrderId, :assignedAt)
                ON CONFLICT (id) DO UPDATE
                SET client_id = EXCLUDED.client_id,
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    category = EXCLUDED.category,
                    created_at = EXCLUDED.created_at,
                    status = EXCLUDED.status,
                    selected_bid_id = EXCLUDED.selected_bid_id,
                    selected_worker_id = EXCLUDED.selected_worker_id,
                    assigned_work_order_id = EXCLUDED.assigned_work_order_id,
                    assigned_at = EXCLUDED.assigned_at
                """)
            .bind("id", need.id())
            .bind("clientId", need.clientId())
            .bind("title", need.title())
            .bind("description", need.description())
            .bind("category", need.category())
            .bind("createdAt", need.createdAt())
            .bind("status", need.status().name());

        spec = need.selectedBidId() == null ? spec.bindNull("selectedBidId", UUID.class) : spec.bind("selectedBidId", need.selectedBidId());
        spec = need.selectedWorkerId() == null ? spec.bindNull("selectedWorkerId", UUID.class) : spec.bind("selectedWorkerId", need.selectedWorkerId());
        spec = need.assignedWorkOrderId() == null ? spec.bindNull("assignedWorkOrderId", UUID.class) : spec.bind("assignedWorkOrderId", need.assignedWorkOrderId());
        spec = need.assignedAt() == null ? spec.bindNull("assignedAt", OffsetDateTime.class) : spec.bind("assignedAt", need.assignedAt());

        return spec.fetch()
            .rowsUpdated()
            .thenReturn(need);
    }

    @Override
    public Mono<ServiceNeed> findNeedById(UUID needId) {
        return serviceNeedRepository.findById(needId).map(this::toDomain);
    }

    @Override
    public Flux<ServiceNeed> findAll() {
        return serviceNeedRepository.findAllByOrderByCreatedAtDesc().map(this::toDomain);
    }

    @Override
    public Flux<ServiceNeed> findByStatus(ServiceNeedStatus status) {
        return serviceNeedRepository.findByStatusOrderByCreatedAtDesc(status.name()).map(this::toDomain);
    }

    @Override
    public Flux<ServiceNeed> findByClientId(UUID clientId) {
        return serviceNeedRepository.findByClientIdOrderByCreatedAtDesc(clientId).map(this::toDomain);
    }

    @Override
    public Mono<BidProposal> save(BidProposal bidProposal) {
        return databaseClient.sql("""
                INSERT INTO bid_proposal(id, need_id, worker_id, labor_cost, summary, created_at)
                VALUES (:id, :needId, :workerId, :laborCost, :summary, :createdAt)
                ON CONFLICT (id) DO UPDATE
                SET need_id = EXCLUDED.need_id,
                    worker_id = EXCLUDED.worker_id,
                    labor_cost = EXCLUDED.labor_cost,
                    summary = EXCLUDED.summary,
                    created_at = EXCLUDED.created_at
                """)
            .bind("id", bidProposal.id())
            .bind("needId", bidProposal.needId())
            .bind("workerId", bidProposal.workerId())
            .bind("laborCost", bidProposal.laborCost())
            .bind("summary", bidProposal.summary())
            .bind("createdAt", bidProposal.createdAt())
            .fetch()
            .rowsUpdated()
            .thenReturn(bidProposal);
    }

    @Override
    public Flux<BidProposal> findByNeedId(UUID needId) {
        return bidProposalRepository.findByNeedIdOrderByCreatedAtAsc(needId).map(this::toDomain);
    }

    @Override
    public Mono<BidProposal> findBidById(UUID bidId) {
        return bidProposalRepository.findById(bidId).map(this::toDomain);
    }

    private ServiceNeed toDomain(ServiceNeedEntity entity) {
        return new ServiceNeed(
            entity.id(),
            entity.clientId(),
            entity.title(),
            entity.description(),
            entity.category(),
            entity.createdAt(),
            entity.status() == null ? ServiceNeedStatus.OPEN : ServiceNeedStatus.valueOf(entity.status()),
            entity.selectedBidId(),
            entity.selectedWorkerId(),
            entity.assignedWorkOrderId(),
            entity.assignedAt()
        );
    }

    private BidProposal toDomain(BidProposalEntity entity) {
        return new BidProposal(
            entity.id(),
            entity.needId(),
            entity.workerId(),
            entity.laborCost(),
            entity.summary(),
            entity.createdAt()
        );
    }
}
