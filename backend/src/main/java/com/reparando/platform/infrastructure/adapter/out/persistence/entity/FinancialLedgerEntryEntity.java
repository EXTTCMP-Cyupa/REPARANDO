package com.reparando.platform.infrastructure.adapter.out.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Table("financial_ledger_entry")
public record FinancialLedgerEntryEntity(
    @Id UUID id,
    UUID workerId,
    String entryType,
    BigDecimal amount,
    String description,
    UUID referenceEntryId,
    String externalReference,
    OffsetDateTime createdAt,
    UUID createdBy
) {
}
