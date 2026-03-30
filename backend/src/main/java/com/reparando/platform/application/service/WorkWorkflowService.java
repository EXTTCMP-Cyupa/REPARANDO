package com.reparando.platform.application.service;

import com.reparando.platform.domain.model.WorkOrder;
import com.reparando.platform.domain.model.WorkMaterial;
import com.reparando.platform.domain.model.WorkStatus;
import com.reparando.platform.domain.port.in.WorkWorkflowUseCase;
import com.reparando.platform.domain.port.out.WorkMaterialRepositoryPort;
import com.reparando.platform.domain.port.out.WorkOrderRepositoryPort;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class WorkWorkflowService implements WorkWorkflowUseCase {

    private final WorkOrderRepositoryPort workOrderRepository;
    private final WorkMaterialRepositoryPort workMaterialRepository;

    public WorkWorkflowService(
        WorkOrderRepositoryPort workOrderRepository,
        WorkMaterialRepositoryPort workMaterialRepository
    ) {
        this.workOrderRepository = workOrderRepository;
        this.workMaterialRepository = workMaterialRepository;
    }

    @Override
    public Mono<WorkOrder> moveWorkStatus(UUID workOrderId, WorkStatus newStatus) {
        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .map(existing -> existing.moveTo(newStatus))
            .flatMap(workOrderRepository::save);
    }

    @Override
    public Flux<WorkOrder> listWorkerOrders(UUID workerId) {
        return workOrderRepository.findByWorkerId(workerId);
    }

    @Override
    public Flux<WorkOrder> listClientOrders(UUID clientId) {
        return workOrderRepository.findByClientId(clientId);
    }

    @Override
    public Mono<WorkMaterial> addMaterial(UUID workOrderId, UUID workerId, String name, int quantity, BigDecimal unitCost) {
        if (name == null || name.isBlank()) {
            return Mono.error(new IllegalArgumentException("Material name is required"));
        }
        if (quantity <= 0) {
            return Mono.error(new IllegalArgumentException("Quantity must be greater than zero"));
        }
        if (unitCost == null || unitCost.compareTo(BigDecimal.ZERO) <= 0) {
            return Mono.error(new IllegalArgumentException("Unit cost must be greater than zero"));
        }

        return workOrderRepository.findById(workOrderId)
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order not found")))
            .filter(order -> order.workerId().equals(workerId))
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Work order does not belong to worker")))
            .flatMap(order -> workMaterialRepository.save(
                new WorkMaterial(
                    UUID.randomUUID(),
                    workOrderId,
                    workerId,
                    name.trim(),
                    quantity,
                    unitCost,
                    OffsetDateTime.now()
                )
            ));
    }

    @Override
    public Flux<WorkMaterial> listMaterials(UUID workOrderId) {
        return workMaterialRepository.findByWorkOrderId(workOrderId);
    }
}
