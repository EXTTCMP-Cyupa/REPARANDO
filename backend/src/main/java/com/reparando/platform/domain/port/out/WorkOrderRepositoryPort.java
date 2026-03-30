package com.reparando.platform.domain.port.out;

import com.reparando.platform.domain.model.WorkOrder;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface WorkOrderRepositoryPort {
    Mono<WorkOrder> findById(UUID id);
    Flux<WorkOrder> findByWorkerId(UUID workerId);
    Flux<WorkOrder> findByClientId(UUID clientId);
    Mono<WorkOrder> save(WorkOrder workOrder);
}
