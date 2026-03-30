package com.reparando.platform.domain.port.in;

import com.reparando.platform.domain.model.BusinessPolicy;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;

public interface AdminSettingsUseCase {
    Mono<BusinessPolicy> getBusinessPolicy();
    Mono<BusinessPolicy> updateBusinessPolicy(BigDecimal leadCost, BigDecimal trustCreditLimit);
}
