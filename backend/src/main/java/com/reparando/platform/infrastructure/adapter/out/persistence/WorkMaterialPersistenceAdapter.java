package com.reparando.platform.infrastructure.adapter.out.persistence;

import com.reparando.platform.domain.model.WorkMaterial;
import com.reparando.platform.domain.port.out.WorkMaterialRepositoryPort;
import io.r2dbc.spi.Row;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class WorkMaterialPersistenceAdapter implements WorkMaterialRepositoryPort {

    private final DatabaseClient databaseClient;

    public WorkMaterialPersistenceAdapter(DatabaseClient databaseClient) {
        this.databaseClient = databaseClient;
    }

    @Override
    public Mono<WorkMaterial> save(WorkMaterial material) {
        return databaseClient.sql("""
                INSERT INTO work_material(id, work_order_id, worker_id, name, quantity, unit_cost, created_at)
                VALUES (:id, :workOrderId, :workerId, :name, :quantity, :unitCost, :createdAt)
                """)
            .bind("id", material.id())
            .bind("workOrderId", material.workOrderId())
            .bind("workerId", material.workerId())
            .bind("name", material.name())
            .bind("quantity", material.quantity())
            .bind("unitCost", material.unitCost())
            .bind("createdAt", material.createdAt())
            .fetch()
            .rowsUpdated()
            .thenReturn(material);
    }

    @Override
    public Flux<WorkMaterial> findByWorkOrderId(UUID workOrderId) {
        return databaseClient.sql("""
                SELECT id, work_order_id, worker_id, name, quantity, unit_cost, created_at
                FROM work_material
                WHERE work_order_id = :workOrderId
                ORDER BY created_at DESC
                """)
            .bind("workOrderId", workOrderId)
            .map((row, metadata) -> toDomain(row))
            .all();
    }

    private WorkMaterial toDomain(Row source) {
        return new WorkMaterial(
            source.get("id", UUID.class),
            source.get("work_order_id", UUID.class),
            source.get("worker_id", UUID.class),
            source.get("name", String.class),
            source.get("quantity", Integer.class),
            source.get("unit_cost", java.math.BigDecimal.class),
            source.get("created_at", java.time.OffsetDateTime.class)
        );
    }
}