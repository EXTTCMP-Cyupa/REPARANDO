package com.reparando.platform.domain.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record WorkNote(
    String description,
    BigDecimal additionalCost,
    String evidencePhotos,
    OffsetDateTime createdAt,
    Boolean clientApproved
) {
}
