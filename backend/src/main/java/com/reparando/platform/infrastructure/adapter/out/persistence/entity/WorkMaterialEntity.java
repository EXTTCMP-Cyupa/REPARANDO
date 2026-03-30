package com.reparando.platform.infrastructure.adapter.out.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Table("work_material")
public record WorkMaterialEntity(
    @Id UUID id,
    UUID workOrderId,
    UUID workerId,
    String name,
    Integer quantity,
    BigDecimal unitCost,
    OffsetDateTime createdAt
) {
}