package com.reparando.platform.domain.port.out;

import com.reparando.platform.domain.model.LeadCharge;
import reactor.core.publisher.Mono;

public interface LeadChargeRepositoryPort {
    Mono<LeadCharge> save(LeadCharge leadCharge);
}
