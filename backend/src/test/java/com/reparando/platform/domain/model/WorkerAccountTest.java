package com.reparando.platform.domain.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WorkerAccountTest {

    @Test
    void shouldBlockWhenLeadChargeReachesTrustLimit() {
        WorkerAccount account = baseAccount(new BigDecimal("0.00"), false);

        WorkerAccount updated = account.applyLeadCharge(new BigDecimal("1.50"), new BigDecimal("-1.50"));

        assertEquals(new BigDecimal("-1.50"), updated.balance());
        assertTrue(updated.blocked());
    }

    @Test
    void shouldNotBlockWhenLeadChargeStaysAboveTrustLimit() {
        WorkerAccount account = baseAccount(new BigDecimal("0.00"), false);

        WorkerAccount updated = account.applyLeadCharge(new BigDecimal("1.00"), new BigDecimal("-3.00"));

        assertEquals(new BigDecimal("-1.00"), updated.balance());
        assertFalse(updated.blocked());
    }

    @Test
    void shouldUnblockWhenApprovedDepositGoesAboveTrustLimit() {
        WorkerAccount account = baseAccount(new BigDecimal("-3.50"), true);

        WorkerAccount updated = account.applyApprovedDeposit(new BigDecimal("5.00"), new BigDecimal("-3.00"));

        assertEquals(new BigDecimal("1.50"), updated.balance());
        assertFalse(updated.blocked());
    }

    @Test
    void shouldRemainBlockedWhenApprovedDepositStillAtLimit() {
        WorkerAccount account = baseAccount(new BigDecimal("-5.00"), true);

        WorkerAccount updated = account.applyApprovedDeposit(new BigDecimal("2.00"), new BigDecimal("-3.00"));

        assertEquals(new BigDecimal("-3.00"), updated.balance());
        assertTrue(updated.blocked());
    }

    @Test
    void shouldRejectNonPositiveLeadChargeAmount() {
        WorkerAccount account = baseAccount(new BigDecimal("0.00"), false);

        assertThrows(IllegalArgumentException.class, () ->
            account.applyLeadCharge(BigDecimal.ZERO, new BigDecimal("-3.00"))
        );
    }

    @Test
    void shouldRejectNonPositiveDepositAmount() {
        WorkerAccount account = baseAccount(new BigDecimal("-2.00"), true);

        assertThrows(IllegalArgumentException.class, () ->
            account.applyApprovedDeposit(new BigDecimal("-1.00"), new BigDecimal("-3.00"))
        );
    }

    private WorkerAccount baseAccount(BigDecimal balance, boolean blocked) {
        return new WorkerAccount(
            UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "Worker Demo",
            "worker@reparando.app",
            balance,
            blocked
        );
    }
}
