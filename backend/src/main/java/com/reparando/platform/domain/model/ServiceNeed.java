package com.reparando.platform.domain.model;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ServiceNeed(
    UUID id,
    UUID clientId,
    String title,
    String description,
    String category,
    OffsetDateTime createdAt
) {
}
