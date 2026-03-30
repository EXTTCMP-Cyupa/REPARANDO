package com.reparando.platform.domain.port.in;

import com.reparando.platform.domain.model.WorkOrder;
import com.reparando.platform.domain.model.WorkMaterial;
import com.reparando.platform.domain.model.WorkStatus;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.UUID;

public interface WorkWorkflowUseCase {
    Mono<WorkOrder> moveWorkStatus(UUID workOrderId, WorkStatus newStatus);
    Flux<WorkOrder> listWorkerOrders(UUID workerId);
    Flux<WorkOrder> listClientOrders(UUID clientId);
    Mono<WorkMaterial> addMaterial(UUID workOrderId, UUID workerId, String name, int quantity, BigDecimal unitCost);
    Flux<WorkMaterial> listMaterials(UUID workOrderId);
}
