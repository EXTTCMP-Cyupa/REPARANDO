package com.reparando.platform.domain.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DepositReceipt(
    UUID id,
    UUID workerId,
    BigDecimal amount,
    PaymentMethod paymentMethod,
    String imagePath,
    DepositStatus status,
    OffsetDateTime createdAt,
    UUID reviewedBy
) {

    public DepositReceipt approve(UUID adminId) {
        return new DepositReceipt(id, workerId, amount, paymentMethod, imagePath, DepositStatus.APPROVED, createdAt, adminId);
    }

    public DepositReceipt reject(UUID adminId) {
        return new DepositReceipt(id, workerId, amount, paymentMethod, imagePath, DepositStatus.REJECTED, createdAt, adminId);
    }
}
