package com.reparando.platform.infrastructure.adapter.out.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reparando.platform.domain.model.*;
import com.reparando.platform.domain.port.out.WorkOrderRepositoryPort;
import com.reparando.platform.infrastructure.adapter.out.persistence.entity.WorkOrderEntity;
import com.reparando.platform.infrastructure.adapter.out.persistence.repository.WorkOrderR2dbcRepository;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

@Component
public class WorkOrderPersistenceAdapter implements WorkOrderRepositoryPort {

    private final WorkOrderR2dbcRepository repository;
    private final DatabaseClient databaseClient;
    private final ObjectMapper objectMapper;

    public WorkOrderPersistenceAdapter(
        WorkOrderR2dbcRepository repository,
        DatabaseClient databaseClient,
        ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.databaseClient = databaseClient;
        this.objectMapper = objectMapper;
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
        try {
            String diagnosticPhotosJson = objectMapper.writeValueAsString(workOrder.diagnosticPhotos() != null ? workOrder.diagnosticPhotos() : Collections.emptyList());
            String quotationItemsJson = objectMapper.writeValueAsString(workOrder.quotationItems() != null ? workOrder.quotationItems() : Collections.emptyList());
            String workCompletionPhotosJson = objectMapper.writeValueAsString(workOrder.workCompletionPhotos() != null ? workOrder.workCompletionPhotos() : Collections.emptyList());
            String workNotesJson = objectMapper.writeValueAsString(workOrder.workNotes() != null ? workOrder.workNotes() : Collections.emptyList());

            DatabaseClient.GenericExecuteSpec spec = databaseClient.sql("""
                    INSERT INTO work_order(
                        id, client_id, worker_id, status, created_at, description, category,
                        diagnostic_summary, diagnostic_photos, quotation_labor_cost, quotation_materials_cost,
                        quotation_items, client_approval_date, work_completion_photos, work_notes, rating, review, completed_at
                    )
                    VALUES (
                        :id, :clientId, :workerId, :status, :createdAt, :description, :category,
                        :diagnosticSummary, :diagnosticPhotos::jsonb, :quotationLaborCost, :quotationMaterialsCost,
                        :quotationItems::jsonb, :clientApprovalDate, :workCompletionPhotos::jsonb, :workNotes::jsonb, :rating, :review, :completedAt
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        client_id = EXCLUDED.client_id,
                        worker_id = EXCLUDED.worker_id,
                        status = EXCLUDED.status,
                        created_at = EXCLUDED.created_at,
                        description = EXCLUDED.description,
                        category = EXCLUDED.category,
                        diagnostic_summary = EXCLUDED.diagnostic_summary,
                        diagnostic_photos = EXCLUDED.diagnostic_photos,
                        quotation_labor_cost = EXCLUDED.quotation_labor_cost,
                        quotation_materials_cost = EXCLUDED.quotation_materials_cost,
                        quotation_items = EXCLUDED.quotation_items,
                        client_approval_date = EXCLUDED.client_approval_date,
                        work_completion_photos = EXCLUDED.work_completion_photos,
                        work_notes = EXCLUDED.work_notes,
                        rating = EXCLUDED.rating,
                        review = EXCLUDED.review,
                        completed_at = EXCLUDED.completed_at
                    """)
                .bind("id", workOrder.id())
                .bind("clientId", workOrder.clientId())
                .bind("workerId", workOrder.workerId())
                .bind("status", workOrder.status().name())
                .bind("createdAt", workOrder.createdAt() != null ? workOrder.createdAt() : OffsetDateTime.now())
                .bind("diagnosticPhotos", diagnosticPhotosJson)
                .bind("quotationItems", quotationItemsJson)
                .bind("workCompletionPhotos", workCompletionPhotosJson)
                .bind("workNotes", workNotesJson);

            spec = bindNullable(spec, "description", workOrder.description(), String.class);
            spec = bindNullable(spec, "category", workOrder.category(), String.class);
            spec = bindNullable(spec, "diagnosticSummary", workOrder.diagnosticSummary(), String.class);
            spec = bindNullable(spec, "quotationLaborCost", workOrder.quotationLaborCost(), BigDecimal.class);
            spec = bindNullable(spec, "quotationMaterialsCost", workOrder.quotationMaterialsCost(), BigDecimal.class);
            spec = bindNullable(spec, "clientApprovalDate", workOrder.clientApprovalDate(), OffsetDateTime.class);
            spec = bindNullable(spec, "rating", workOrder.rating(), BigDecimal.class);
            spec = bindNullable(spec, "review", workOrder.review(), String.class);
            spec = bindNullable(spec, "completedAt", workOrder.completedAt(), OffsetDateTime.class);

            return spec.fetch()
                .rowsUpdated()
                .thenReturn(workOrder);
        } catch (Exception e) {
            return Mono.error(e);
        }
    }

    private <T> DatabaseClient.GenericExecuteSpec bindNullable(
        DatabaseClient.GenericExecuteSpec spec,
        String name,
        T value,
        Class<T> type
    ) {
        if (value == null) {
            return spec.bindNull(name, type);
        }
        return spec.bind(name, value);
    }

    private WorkOrder toDomain(WorkOrderEntity source) {
        try {
            List<String> diagnosticPhotos = source.diagnosticPhotos() != null && !source.diagnosticPhotos().isBlank() ?
                objectMapper.readValue(source.diagnosticPhotos(), objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)) :
                Collections.emptyList();

            List<QuotationItem> quotationItems = source.quotationItems() != null && !source.quotationItems().isBlank() ?
                objectMapper.readValue(source.quotationItems(), objectMapper.getTypeFactory().constructCollectionType(List.class, QuotationItem.class)) :
                Collections.emptyList();

            List<String> workCompletionPhotos = source.workCompletionPhotos() != null && !source.workCompletionPhotos().isBlank() ?
                objectMapper.readValue(source.workCompletionPhotos(), objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)) :
                Collections.emptyList();

            List<WorkNote> workNotes = source.workNotes() != null && !source.workNotes().isBlank() ?
                objectMapper.readValue(source.workNotes(), objectMapper.getTypeFactory().constructCollectionType(List.class, WorkNote.class)) :
                Collections.emptyList();

            return new WorkOrder(
                source.id(),
                source.clientId(),
                source.workerId(),
                WorkStatus.valueOf(source.status()),
                source.createdAt(),
                source.description(),
                source.category(),
                source.diagnosticSummary(),
                diagnosticPhotos,
                source.quotationLaborCost(),
                source.quotationMaterialsCost(),
                quotationItems,
                source.clientApprovalDate(),
                workCompletionPhotos,
                workNotes,
                source.rating(),
                source.review(),
                source.completedAt()
            );
        } catch (Exception e) {
            throw new RuntimeException("Error deserializing WorkOrder: " + e.getMessage(), e);
        }
    }
}
