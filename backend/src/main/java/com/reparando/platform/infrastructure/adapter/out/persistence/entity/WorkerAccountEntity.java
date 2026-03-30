package com.reparando.platform.infrastructure.adapter.out.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Table("worker_account")
public record WorkerAccountEntity(
    @Id UUID id,
    String fullName,
    String email,
    BigDecimal balance,
    boolean blocked
) {
}
