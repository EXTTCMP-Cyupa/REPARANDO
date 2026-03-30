package com.reparando.platform.infrastructure.adapter.out.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Table("lead_charge")
public record LeadChargeEntity(
    @Id UUID id,
    UUID workerId,
    UUID clientId,
    BigDecimal amount,
    OffsetDateTime chargedAt,
    String source
) {
}
