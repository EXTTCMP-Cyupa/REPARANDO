package com.reparando.platform.infrastructure.adapter.out.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Table("work_order")
public record WorkOrderEntity(
    @Id UUID id,
    UUID clientId,
    UUID workerId,
    String status,
    OffsetDateTime createdAt,
    String description,
    String category,
    String diagnosticSummary,
    String diagnosticPhotos,
    BigDecimal quotationLaborCost,
    BigDecimal quotationMaterialsCost,
    String quotationItems,
    OffsetDateTime clientApprovalDate,
    String workCompletionPhotos,
    String workNotes,
    BigDecimal rating,
    String review,
    OffsetDateTime completedAt
) {
}
