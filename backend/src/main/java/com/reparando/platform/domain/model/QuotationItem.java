package com.reparando.platform.domain.model;

import java.math.BigDecimal;

public record QuotationItem(
    String name,
    String unit,
    Integer quantity,
    BigDecimal unitPrice,
    BigDecimal totalPrice
) {
}
