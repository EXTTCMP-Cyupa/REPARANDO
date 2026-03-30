package com.reparando.platform.domain.model;

import java.math.BigDecimal;

public record BusinessPolicy(
    BigDecimal leadCost,
    BigDecimal trustCreditLimit
) {
}
