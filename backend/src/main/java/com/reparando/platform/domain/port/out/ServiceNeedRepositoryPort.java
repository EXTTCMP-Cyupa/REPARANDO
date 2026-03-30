package com.reparando.platform.domain.port.out;

import com.reparando.platform.domain.model.ServiceNeed;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface ServiceNeedRepositoryPort {
    Mono<ServiceNeed> save(ServiceNeed need);
    Mono<ServiceNeed> findNeedById(UUID needId);
    Flux<ServiceNeed> findAll();
    Flux<ServiceNeed> findByClientId(UUID clientId);
}
