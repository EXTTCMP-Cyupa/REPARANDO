package com.reparando.platform.infrastructure.adapter.out.persistence;

import com.reparando.platform.domain.model.WorkOrder;
import com.reparando.platform.domain.model.WorkStatus;
import com.reparando.platform.domain.port.out.WorkOrderRepositoryPort;
import com.reparando.platform.infrastructure.adapter.out.persistence.entity.WorkOrderEntity;
import com.reparando.platform.infrastructure.adapter.out.persistence.repository.WorkOrderR2dbcRepository;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class WorkOrderPersistenceAdapter implements WorkOrderRepositoryPort {

    private final WorkOrderR2dbcRepository repository;
    private final DatabaseClient databaseClient;

    public WorkOrderPersistenceAdapter(
        WorkOrderR2dbcRepository repository,
        DatabaseClient databaseClient
    ) {
        this.repository = repository;
        this.databaseClient = databaseClient;
    }

    @Override
    public Mono<WorkOrder> findById(UUID id) {
        return repository.findById(id).map(this::toDomain);
    }

    @Override
    public Flux<WorkOrder> findByWorkerId(UUID workerId) {
        return repository.findByWorkerIdOrderByIdDesc(workerId).map(this::toDomain);
    }

    @Override
    public Flux<WorkOrder> findByClientId(UUID clientId) {
        return repository.findByClientIdOrderByIdDesc(clientId).map(this::toDomain);
    }

    @Override
    public Mono<WorkOrder> save(WorkOrder workOrder) {
        return databaseClient.sql("""
                INSERT INTO work_order(id, client_id, worker_id, status)
                VALUES (:id, :clientId, :workerId, :status)
                ON CONFLICT (id) DO UPDATE
                SET client_id = EXCLUDED.client_id,
                    worker_id = EXCLUDED.worker_id,
                    status = EXCLUDED.status
                """)
            .bind("id", workOrder.id())
            .bind("clientId", workOrder.clientId())
            .bind("workerId", workOrder.workerId())
            .bind("status", workOrder.status().name())
            .fetch()
            .rowsUpdated()
            .thenReturn(workOrder);
    }

    private WorkOrder toDomain(WorkOrderEntity source) {
        return new WorkOrder(
            source.id(),
            source.clientId(),
            source.workerId(),
            WorkStatus.valueOf(source.status())
        );
    }
}
