package com.reparando.platform.domain.port.out;

import com.reparando.platform.domain.model.ProfessionalProfile;
import reactor.core.publisher.Flux;

public interface ProfessionalProfileRepositoryPort {
    Flux<ProfessionalProfile> findAll();
}
