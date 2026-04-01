package com.reparando.platform.domain.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record LedgerEntry(
    UUID id,
    UUID workerId,
    LedgerEntryType entryType,
    BigDecimal amount,
    String description,
    UUID referenceEntryId,
    String externalReference,
    OffsetDateTime createdAt,
    UUID createdBy
) {
}
