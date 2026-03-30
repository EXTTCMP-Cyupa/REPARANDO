package com.reparando.platform.domain.model;

import java.math.BigDecimal;
import java.util.UUID;

public record WorkerAccount(
    UUID id,
    String fullName,
    String email,
    BigDecimal balance,
    boolean blocked
) {

    public WorkerAccount applyLeadCharge(BigDecimal amount, BigDecimal trustCreditLimit) {
        validatePositiveAmount(amount, "Lead charge amount must be greater than zero");
        BigDecimal newBalance = balance.subtract(amount);
        boolean mustBlock = newBalance.compareTo(trustCreditLimit) <= 0;
        return new WorkerAccount(id, fullName, email, newBalance, mustBlock);
    }

    public WorkerAccount applyApprovedDeposit(BigDecimal amount, BigDecimal trustCreditLimit) {
        validatePositiveAmount(amount, "Deposit amount must be greater than zero");
        BigDecimal newBalance = balance.add(amount);
        boolean remainsBlocked = newBalance.compareTo(trustCreditLimit) <= 0;
        return new WorkerAccount(id, fullName, email, newBalance, remainsBlocked);
    }

    private static void validatePositiveAmount(BigDecimal amount, String message) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(message);
        }
    }
}
