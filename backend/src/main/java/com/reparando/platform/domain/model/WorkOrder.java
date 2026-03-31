package com.reparando.platform.domain.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

public record WorkOrder(
    UUID id,
    UUID clientId,
    UUID workerId,
    WorkStatus status,
    OffsetDateTime createdAt,
    String description,
    String category,
    String diagnosticSummary,
    List<String> diagnosticPhotos,
    BigDecimal quotationLaborCost,
    BigDecimal quotationMaterialsCost,
    List<QuotationItem> quotationItems,
    OffsetDateTime clientApprovalDate,
    List<String> workCompletionPhotos,
    List<WorkNote> workNotes,
    BigDecimal rating,
    String review,
    OffsetDateTime completedAt
) {

    public WorkOrder moveTo(WorkStatus newStatus) {
        Set<WorkStatus> allowed = switch (status) {
            case DIAGNOSTICO -> Set.of(WorkStatus.COTIZADO);
            case COTIZADO -> Set.of(WorkStatus.EN_PROCESO);
            case EN_PROCESO -> Set.of(WorkStatus.FINALIZADO);
            case FINALIZADO -> Set.of();
        };

        if (!allowed.contains(newStatus)) {
            throw new IllegalStateException("Invalid status transition: " + status + " -> " + newStatus);
        }

        return new WorkOrder(
            id, clientId, workerId, newStatus, createdAt, description, category,
            diagnosticSummary, diagnosticPhotos, quotationLaborCost, quotationMaterialsCost,
            quotationItems, clientApprovalDate, workCompletionPhotos, workNotes, rating, review, completedAt
        );
    }

    public WorkOrder withDiagnostic(String summary, List<String> photos) {
        return new WorkOrder(
            id, clientId, workerId, status, createdAt, description, category,
            summary, photos, quotationLaborCost, quotationMaterialsCost,
            quotationItems, clientApprovalDate, workCompletionPhotos, workNotes, rating, review, completedAt
        );
    }

    public WorkOrder withQuotation(BigDecimal laborCost, BigDecimal materialsCost, List<QuotationItem> items) {
        return new WorkOrder(
            id, clientId, workerId, status, createdAt, description, category,
            diagnosticSummary, diagnosticPhotos, laborCost, materialsCost,
            items, clientApprovalDate, workCompletionPhotos, workNotes, rating, review, completedAt
        );
    }

    public WorkOrder approveQuotation() {
        return new WorkOrder(
            id, clientId, workerId, status, createdAt, description, category,
            diagnosticSummary, diagnosticPhotos, quotationLaborCost, quotationMaterialsCost,
            quotationItems, OffsetDateTime.now(), workCompletionPhotos, workNotes, rating, review, completedAt
        );
    }

    public WorkOrder addWorkNote(WorkNote note) {
        List<WorkNote> updated = new ArrayList<>(workNotes != null ? workNotes : Collections.emptyList());
        updated.add(note);
        return new WorkOrder(
            id, clientId, workerId, status, createdAt, description, category,
            diagnosticSummary, diagnosticPhotos, quotationLaborCost, quotationMaterialsCost,
            quotationItems, clientApprovalDate, workCompletionPhotos, updated, rating, review, completedAt
        );
    }

    public WorkOrder complete(List<String> photos, BigDecimal rating, String review) {
        return new WorkOrder(
            id, clientId, workerId, status, createdAt, description, category,
            diagnosticSummary, diagnosticPhotos, quotationLaborCost, quotationMaterialsCost,
            quotationItems, clientApprovalDate, photos, workNotes, rating, review, OffsetDateTime.now()
        );
    }
}
