package com.reparando.platform.domain.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record BidProposal(
    UUID id,
    UUID needId,
    UUID workerId,
    BigDecimal laborCost,
    String summary,
    OffsetDateTime createdAt
) {
}
