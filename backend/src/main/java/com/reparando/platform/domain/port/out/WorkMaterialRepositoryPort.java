package com.reparando.platform.domain.port.out;

import com.reparando.platform.domain.model.WorkMaterial;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface WorkMaterialRepositoryPort {
    Mono<WorkMaterial> save(WorkMaterial material);
    Flux<WorkMaterial> findByWorkOrderId(UUID workOrderId);
}