package com.reparando.platform.infrastructure.adapter.out.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

@Table("work_order")
public record WorkOrderEntity(
    @Id UUID id,
    UUID clientId,
    UUID workerId,
    String status
) {
}
