package com.reparando.platform.application.service;

import com.reparando.platform.domain.model.BusinessPolicy;
import com.reparando.platform.domain.port.in.AdminSettingsUseCase;
import com.reparando.platform.domain.port.out.BusinessPolicyRepositoryPort;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;

@Service
public class AdminSettingsService implements AdminSettingsUseCase {

    private final BusinessPolicyRepositoryPort repository;

    public AdminSettingsService(BusinessPolicyRepositoryPort repository) {
        this.repository = repository;
    }

    @Override
    public Mono<BusinessPolicy> getBusinessPolicy() {
        return repository.getCurrent();
    }

    @Override
    public Mono<BusinessPolicy> updateBusinessPolicy(BigDecimal leadCost, BigDecimal trustCreditLimit) {
        if (leadCost.compareTo(BigDecimal.ZERO) <= 0) {
            return Mono.error(new IllegalArgumentException("Lead cost must be greater than zero"));
        }
        if (trustCreditLimit.compareTo(BigDecimal.ZERO) > 0) {
            return Mono.error(new IllegalArgumentException("Trust credit limit must be zero or negative"));
        }
        return repository.save(new BusinessPolicy(leadCost, trustCreditLimit));
    }
}
