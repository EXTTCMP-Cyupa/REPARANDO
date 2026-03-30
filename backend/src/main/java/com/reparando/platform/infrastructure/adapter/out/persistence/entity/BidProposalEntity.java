package com.reparando.platform.infrastructure.adapter.out.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Table("bid_proposal")
public record BidProposalEntity(
    @Id UUID id,
    UUID needId,
    UUID workerId,
    BigDecimal laborCost,
    String summary,
    OffsetDateTime createdAt
) {
}
