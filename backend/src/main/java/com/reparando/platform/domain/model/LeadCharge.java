package com.reparando.platform.domain.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record LeadCharge(
    UUID id,
    UUID workerId,
    UUID clientId,
    BigDecimal amount,
    OffsetDateTime chargedAt,
    String source
) {
}
