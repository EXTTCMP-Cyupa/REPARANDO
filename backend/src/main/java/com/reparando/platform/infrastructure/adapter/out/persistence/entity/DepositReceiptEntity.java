package com.reparando.platform.infrastructure.adapter.out.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Table("deposit_receipt")
public record DepositReceiptEntity(
    @Id UUID id,
    UUID workerId,
    BigDecimal amount,
    String paymentMethod,
    String imagePath,
    String status,
    OffsetDateTime createdAt,
    UUID reviewedBy
) {
}
