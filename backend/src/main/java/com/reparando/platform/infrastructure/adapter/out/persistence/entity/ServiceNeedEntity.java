package com.reparando.platform.infrastructure.adapter.out.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Table("service_need")
public record ServiceNeedEntity(
    @Id UUID id,
    UUID clientId,
    String title,
    String description,
    String category,
    OffsetDateTime createdAt
) {
}
