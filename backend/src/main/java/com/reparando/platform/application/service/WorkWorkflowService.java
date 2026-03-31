package com.reparando.platform.application.service;

import com.reparando.platform.domain.model.*;
import com.reparando.platform.domain.port.in.WorkWorkflowUseCase;
import com.reparando.platform.domain.port.out.WorkMaterialRepositoryPort;
import com.reparando.platform.domain.port.out.WorkOrderRepositoryPort;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class WorkWorkflowService implements WorkWorkflowUseCase {

    private final WorkOrderRepositoryPort workOrderRepository;
    private final WorkMaterialRepositoryPort workMaterialRepository;

    public WorkWorkflowService(
        WorkOrderRepositoryPort workOrderRepository,
        WorkMaterialRepositoryPort workMaterialRepository
    ) {
        this.workOrderRepository = workOrderRepository;
        this.workMaterialRepository = workMaterialRepository;
    }

    @Override
    public Mono<WorkOrder> createWorkOrder(UUID clientId, UUID workerId, String description, String category) {
        if (clientId == null || clientId.equals(new UUID(0, 0))) {
            return Mono.error(new IllegalArgumentException("Client ID is required"));
        }
        if (workerId == null || workerId.equals(new UUID(0, 0))) {
            return Mono.error(new IllegalArgumentException("Worker ID is required"));
        }
        if (description == null || description.isBlank()) {
            return Mono.error(new IllegalArgumentException("Description is required"));
        }
        if (category == null || category.isBlank()) {
            return Mono.error(new IllegalArgumentException("Category is required"));
        }

        WorkOrder newOrder = new WorkOrder(
            UUID.randomUUID(),
            clientId,
            workerId,
            WorkStatus.DIAGNOSTICO,
            OffsetDateTime.now(),
            description.trim(),
            category.trim(),
            null,
            Collections.emptyList(),
            null,
            null,
            Collections.emptyList(),
            null,
            Collections.emptyList(),
            Collections.emptyList(),
            null,
            null,
            null
        );

        return workOrderRepository.save(newOrder);
    }

    @Override
    public Mono<WorkOrder> moveWorkStatus(UUID workOrderId, WorkStatus newStatus) {
        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .map(existing -> existing.moveTo(newStatus))
            .flatMap(workOrderRepository::save);
    }

    @Override
    public Flux<WorkOrder> listWorkerOrders(UUID workerId) {
        return workOrderRepository.findByWorkerId(workerId);
    }

    @Override
    public Flux<WorkOrder> listClientOrders(UUID clientId) {
        return workOrderRepository.findByClientId(clientId);
    }

    @Override
    public Mono<WorkMaterial> addMaterial(UUID workOrderId, UUID workerId, String name, int quantity, BigDecimal unitCost) {
        if (name == null || name.isBlank()) {
            return Mono.error(new IllegalArgumentException("Material name is required"));
        }
        if (quantity <= 0) {
            return Mono.error(new IllegalArgumentException("Quantity must be greater than zero"));
        }
        if (unitCost == null || unitCost.compareTo(BigDecimal.ZERO) <= 0) {
            return Mono.error(new IllegalArgumentException("Unit cost must be greater than zero"));
        }

        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .filter(order -> order.workerId().equals(workerId))
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order does not belong to worker")))
            .flatMap(order -> workMaterialRepository.save(
                new WorkMaterial(
                    UUID.randomUUID(),
                    workOrderId,
                    workerId,
                    name.trim(),
                    quantity,
                    unitCost,
                    OffsetDateTime.now()
                )
            ));
    }

    @Override
    public Flux<WorkMaterial> listMaterials(UUID workOrderId) {
        return workMaterialRepository.findByWorkOrderId(workOrderId);
    }

    @Override
    public Mono<WorkOrder> submitDiagnostic(UUID workOrderId, String summary, List<String> photoUrls) {
        if (summary == null || summary.isBlank()) {
            return Mono.error(new IllegalArgumentException("Diagnostic summary is required"));
        }
        if (photoUrls == null || photoUrls.isEmpty()) {
            return Mono.error(new IllegalArgumentException("At least one diagnostic photo is required"));
        }

        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .filter(order -> order.status() == WorkStatus.DIAGNOSTICO)
            .switchIfEmpty(Mono.error(new IllegalStateException("Work order is not in DIAGNOSTICO status")))
            .map(order -> order.withDiagnostic(summary.trim(), photoUrls))
            .flatMap(workOrderRepository::save);
    }

    @Override
    public Mono<WorkOrder> getDiagnostic(UUID workOrderId) {
        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .filter(order -> order.diagnosticSummary() != null)
            .switchIfEmpty(Mono.error(new IllegalStateException("No diagnostic found for this work order")));
    }

    @Override
    public Mono<WorkOrder> submitQuotation(UUID workOrderId, UUID workerId, BigDecimal laborCost, BigDecimal materialsCost, List<QuotationItem> items) {
        if (laborCost == null || laborCost.compareTo(BigDecimal.ZERO) < 0) {
            return Mono.error(new IllegalArgumentException("Labor cost must be non-negative"));
        }
        if (materialsCost == null || materialsCost.compareTo(BigDecimal.ZERO) < 0) {
            return Mono.error(new IllegalArgumentException("Materials cost must be non-negative"));
        }
        if (items == null || items.isEmpty()) {
            return Mono.error(new IllegalArgumentException("Quotation items are required"));
        }

        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .filter(order -> order.workerId().equals(workerId))
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order does not belong to worker")))
            .filter(order -> order.status() == WorkStatus.DIAGNOSTICO)
            .switchIfEmpty(Mono.error(new IllegalStateException("Work order must be in DIAGNOSTICO status")))
            .map(order -> order.withQuotation(laborCost, materialsCost, items).moveTo(WorkStatus.COTIZADO))
            .flatMap(workOrderRepository::save);
    }

    @Override
    public Mono<WorkOrder> getQuotation(UUID workOrderId) {
        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .filter(order -> order.quotationLaborCost() != null)
            .switchIfEmpty(Mono.error(new IllegalStateException("No quotation found for this work order")));
    }

    @Override
    public Mono<WorkOrder> approveQuotation(UUID workOrderId, UUID clientId) {
        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .filter(order -> order.clientId().equals(clientId))
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order does not belong to client")))
            .filter(order -> order.status() == WorkStatus.COTIZADO)
            .switchIfEmpty(Mono.error(new IllegalStateException("Work order must be in COTIZADO status")))
            .filter(order -> order.quotationLaborCost() != null)
            .switchIfEmpty(Mono.error(new IllegalStateException("No quotation to approve")))
            .map(order -> order.approveQuotation().moveTo(WorkStatus.EN_PROCESO))
            .flatMap(workOrderRepository::save);
    }

    @Override
    public Mono<WorkOrder> addWorkNote(UUID workOrderId, String description, BigDecimal additionalCost, String evidencePhotos) {
        if (description == null || description.isBlank()) {
            return Mono.error(new IllegalArgumentException("Work note description is required"));
        }
        if (additionalCost == null || additionalCost.compareTo(BigDecimal.ZERO) < 0) {
            return Mono.error(new IllegalArgumentException("Additional cost must be non-negative"));
        }

        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .filter(order -> order.status() == WorkStatus.EN_PROCESO)
            .switchIfEmpty(Mono.error(new IllegalStateException("Work order must be in EN_PROCESO status")))
            .map(order -> {
                WorkNote note = new WorkNote(
                    description.trim(),
                    additionalCost,
                    evidencePhotos,
                    OffsetDateTime.now(),
                    null
                );
                return order.addWorkNote(note);
            })
            .flatMap(workOrderRepository::save);
    }

    @Override
    public Mono<WorkOrder> approveWorkNote(UUID workOrderId, int noteIndex, UUID clientId) {
        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .filter(order -> order.clientId().equals(clientId))
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order does not belong to client")))
            .map(order -> {
                List<WorkNote> notes = order.workNotes() != null ? new ArrayList<>(order.workNotes()) : new ArrayList<>();
                if (noteIndex < 0 || noteIndex >= notes.size()) {
                    throw new IllegalArgumentException("Invalid work note index");
                }
                WorkNote note = notes.get(noteIndex);
                if (note.clientApproved() != null) {
                    throw new IllegalStateException("Work note was already reviewed by client");
                }
                WorkNote approved = new WorkNote(note.description(), note.additionalCost(), note.evidencePhotos(), note.createdAt(), true);
                notes.set(noteIndex, approved);
                return new WorkOrder(
                    order.id(), order.clientId(), order.workerId(), order.status(), order.createdAt(),
                    order.description(), order.category(), order.diagnosticSummary(), order.diagnosticPhotos(),
                    order.quotationLaborCost(), order.quotationMaterialsCost(), order.quotationItems(),
                    order.clientApprovalDate(), order.workCompletionPhotos(), notes, order.rating(), order.review(), order.completedAt()
                );
            })
            .flatMap(workOrderRepository::save);
    }

    @Override
    public Mono<WorkOrder> rejectWorkNote(UUID workOrderId, int noteIndex, UUID clientId) {
        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .filter(order -> order.clientId().equals(clientId))
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order does not belong to client")))
            .map(order -> {
                List<WorkNote> notes = order.workNotes() != null ? new ArrayList<>(order.workNotes()) : new ArrayList<>();
                if (noteIndex < 0 || noteIndex >= notes.size()) {
                    throw new IllegalArgumentException("Invalid work note index");
                }
                WorkNote note = notes.get(noteIndex);
                if (note.clientApproved() != null) {
                    throw new IllegalStateException("Work note was already reviewed by client");
                }
                WorkNote rejected = new WorkNote(note.description(), note.additionalCost(), note.evidencePhotos(), note.createdAt(), false);
                notes.set(noteIndex, rejected);
                return new WorkOrder(
                    order.id(), order.clientId(), order.workerId(), order.status(), order.createdAt(),
                    order.description(), order.category(), order.diagnosticSummary(), order.diagnosticPhotos(),
                    order.quotationLaborCost(), order.quotationMaterialsCost(), order.quotationItems(),
                    order.clientApprovalDate(), order.workCompletionPhotos(), notes, order.rating(), order.review(), order.completedAt()
                );
            })
            .flatMap(workOrderRepository::save);
    }

    @Override
    public Mono<WorkOrder> completeWork(UUID workOrderId, List<String> completionPhotos) {
        if (completionPhotos == null || completionPhotos.isEmpty()) {
            return Mono.error(new IllegalArgumentException("Completion photos are required"));
        }

        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .filter(order -> order.status() == WorkStatus.EN_PROCESO)
            .switchIfEmpty(Mono.error(new IllegalStateException("Work order must be in EN_PROCESO status")))
            .map(order -> new WorkOrder(
                order.id(), order.clientId(), order.workerId(), WorkStatus.FINALIZADO, order.createdAt(),
                order.description(), order.category(), order.diagnosticSummary(), order.diagnosticPhotos(),
                order.quotationLaborCost(), order.quotationMaterialsCost(), order.quotationItems(),
                order.clientApprovalDate(), completionPhotos, order.workNotes(), null, null, OffsetDateTime.now()
            ))
            .flatMap(workOrderRepository::save);
    }

    @Override
    public Mono<WorkOrder> submitRating(UUID workOrderId, BigDecimal rating, String review) {
        if (rating == null || rating.compareTo(BigDecimal.ZERO) < 0 || rating.compareTo(new BigDecimal("5")) > 0) {
            return Mono.error(new IllegalArgumentException("Rating must be between 0 and 5"));
        }
        final String finalReview = review == null ? "" : review;

        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .filter(order -> order.status() == WorkStatus.FINALIZADO)
            .switchIfEmpty(Mono.error(new IllegalStateException("Work order must be in FINALIZADO status")))
            .map(order -> new WorkOrder(
                order.id(), order.clientId(), order.workerId(), order.status(), order.createdAt(),
                order.description(), order.category(), order.diagnosticSummary(), order.diagnosticPhotos(),
                order.quotationLaborCost(), order.quotationMaterialsCost(), order.quotationItems(),
                order.clientApprovalDate(), order.workCompletionPhotos(), order.workNotes(), rating, finalReview.trim(), order.completedAt()
            ))
            .flatMap(workOrderRepository::save);
    }
}
