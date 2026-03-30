package com.reparando.platform.domain.port.out;

import com.reparando.platform.domain.model.BusinessPolicy;
import reactor.core.publisher.Mono;

public interface BusinessPolicyRepositoryPort {
    Mono<BusinessPolicy> getCurrent();
    Mono<BusinessPolicy> save(BusinessPolicy policy);
}
