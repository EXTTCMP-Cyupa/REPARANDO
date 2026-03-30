package com.reparando.platform.domain.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record WorkMaterial(
    UUID id,
    UUID workOrderId,
    UUID workerId,
    String name,
    int quantity,
    BigDecimal unitCost,
    OffsetDateTime createdAt
) {
}