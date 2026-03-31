package com.reparando.platform.domain.model;

import java.time.OffsetDateTime;

public record Diagnostic(
    String summary,
    String photoUrls,
    OffsetDateTime createdAt
) {
}
