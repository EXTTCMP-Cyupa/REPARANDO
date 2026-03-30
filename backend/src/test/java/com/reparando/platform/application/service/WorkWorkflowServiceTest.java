package com.reparando.platform.application.service;

import com.reparando.platform.domain.model.WorkMaterial;
import com.reparando.platform.domain.model.WorkOrder;
import com.reparando.platform.domain.model.WorkStatus;
import com.reparando.platform.domain.port.out.WorkMaterialRepositoryPort;
import com.reparando.platform.domain.port.out.WorkOrderRepositoryPort;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class WorkWorkflowServiceTest {

    private final WorkOrderRepositoryPort workOrderRepository = mock(WorkOrderRepositoryPort.class);
    private final WorkMaterialRepositoryPort workMaterialRepository = mock(WorkMaterialRepositoryPort.class);

    private final WorkWorkflowService service = new WorkWorkflowService(workOrderRepository, workMaterialRepository);

    @Test
    void shouldAddMaterialWhenOrderBelongsToWorker() {
        UUID workOrderId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID workerId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        WorkOrder order = new WorkOrder(workOrderId, UUID.fromString("33333333-3333-3333-3333-333333333333"), workerId, WorkStatus.DIAGNOSTICO);

        when(workOrderRepository.findById(workOrderId)).thenReturn(Mono.just(order));
        when(workMaterialRepository.save(any(WorkMaterial.class))).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

        StepVerifier.create(service.addMaterial(workOrderId, workerId, "  Cable AWG 12  ", 2, new BigDecimal("19.75")))
            .assertNext(material -> {
                assertEquals(workOrderId, material.workOrderId());
                assertEquals(workerId, material.workerId());
                assertEquals("Cable AWG 12", material.name());
                assertEquals(2, material.quantity());
                assertEquals(new BigDecimal("19.75"), material.unitCost());
            })
            .verifyComplete();

        verify(workOrderRepository).findById(workOrderId);
        verify(workMaterialRepository).save(any(WorkMaterial.class));
    }

    @Test
    void shouldRejectBlankMaterialName() {
        StepVerifier.create(service.addMaterial(UUID.randomUUID(), UUID.randomUUID(), "   ", 1, new BigDecimal("10.00")))
            .expectErrorMatches(error -> error instanceof IllegalArgumentException
                && "Material name is required".equals(error.getMessage()))
            .verify();

        verifyNoInteractions(workOrderRepository);
        verifyNoInteractions(workMaterialRepository);
    }

    @Test
    void shouldRejectNonPositiveQuantity() {
        StepVerifier.create(service.addMaterial(UUID.randomUUID(), UUID.randomUUID(), "Cable", 0, new BigDecimal("10.00")))
            .expectErrorMatches(error -> error instanceof IllegalArgumentException
                && "Quantity must be greater than zero".equals(error.getMessage()))
            .verify();

        verifyNoInteractions(workOrderRepository);
        verifyNoInteractions(workMaterialRepository);
    }

    @Test
    void shouldRejectNonPositiveUnitCost() {
        StepVerifier.create(service.addMaterial(UUID.randomUUID(), UUID.randomUUID(), "Cable", 1, BigDecimal.ZERO))
            .expectErrorMatches(error -> error instanceof IllegalArgumentException
                && "Unit cost must be greater than zero".equals(error.getMessage()))
            .verify();

        verifyNoInteractions(workOrderRepository);
        verifyNoInteractions(workMaterialRepository);
    }

    @Test
    void shouldRejectWhenOrderBelongsToAnotherWorker() {
        UUID workOrderId = UUID.randomUUID();
        UUID ownerWorkerId = UUID.randomUUID();
        UUID otherWorkerId = UUID.randomUUID();
        WorkOrder order = new WorkOrder(workOrderId, UUID.randomUUID(), ownerWorkerId, WorkStatus.DIAGNOSTICO);

        when(workOrderRepository.findById(workOrderId)).thenReturn(Mono.just(order));

        StepVerifier.create(service.addMaterial(workOrderId, otherWorkerId, "Cable", 1, new BigDecimal("10.00")))
            .expectErrorMatches(error -> error instanceof IllegalArgumentException
                && "Work order does not belong to worker".equals(error.getMessage()))
            .verify();

        verify(workOrderRepository).findById(workOrderId);
        verify(workMaterialRepository, never()).save(any(WorkMaterial.class));
    }

    @Test
    void shouldListMaterialsByOrderId() {
        UUID workOrderId = UUID.randomUUID();
        WorkMaterial first = new WorkMaterial(UUID.randomUUID(), workOrderId, UUID.randomUUID(), "Cable", 1, new BigDecimal("5.00"), java.time.OffsetDateTime.now());
        WorkMaterial second = new WorkMaterial(UUID.randomUUID(), workOrderId, UUID.randomUUID(), "Tornillo", 20, new BigDecimal("0.50"), java.time.OffsetDateTime.now());

        when(workMaterialRepository.findByWorkOrderId(workOrderId)).thenReturn(Flux.just(first, second));

        StepVerifier.create(service.listMaterials(workOrderId))
            .expectNext(first)
            .expectNext(second)
            .verifyComplete();

        verify(workMaterialRepository).findByWorkOrderId(workOrderId);
    }
}
