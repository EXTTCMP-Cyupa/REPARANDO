package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.domain.model.WorkOrder;
import com.reparando.platform.domain.model.WorkMaterial;
import com.reparando.platform.domain.model.WorkStatus;
import com.reparando.platform.domain.port.in.WorkWorkflowUseCase;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workflow")
@Validated
public class WorkWorkflowController {

    private final WorkWorkflowUseCase workWorkflowUseCase;

    public WorkWorkflowController(WorkWorkflowUseCase workWorkflowUseCase) {
        this.workWorkflowUseCase = workWorkflowUseCase;
    }

    @PostMapping("/{workOrderId}/status")
    @ResponseStatus(HttpStatus.OK)
    public Mono<WorkOrder> moveStatus(@PathVariable UUID workOrderId, @RequestBody @Valid MoveStatusRequest request) {
        return workWorkflowUseCase.moveWorkStatus(workOrderId, request.newStatus());
    }

    @GetMapping("/worker/{workerId}")
    public Flux<WorkOrder> listWorkerOrders(@PathVariable UUID workerId) {
        return workWorkflowUseCase.listWorkerOrders(workerId);
    }

    @GetMapping("/client/{clientId}")
    public Flux<WorkOrder> listClientOrders(@PathVariable UUID clientId) {
        return workWorkflowUseCase.listClientOrders(clientId);
    }

    @PostMapping("/{workOrderId}/materials")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<WorkMaterial> addMaterial(@PathVariable UUID workOrderId, @RequestBody @Valid AddMaterialRequest request) {
        return workWorkflowUseCase.addMaterial(
            workOrderId,
            request.workerId(),
            request.name(),
            request.quantity(),
            request.unitCost()
        );
    }

    @GetMapping("/{workOrderId}/materials")
    @ResponseStatus(HttpStatus.OK)
    public Flux<WorkMaterial> listMaterials(@PathVariable UUID workOrderId) {
        return workWorkflowUseCase.listMaterials(workOrderId);
    }

    public record MoveStatusRequest(@NotNull WorkStatus newStatus) {
    }

    public record AddMaterialRequest(
        @NotNull UUID workerId,
        @NotBlank String name,
        @NotNull @Min(1) Integer quantity,
        @NotNull @DecimalMin("0.01") BigDecimal unitCost
    ) {
    }
}
