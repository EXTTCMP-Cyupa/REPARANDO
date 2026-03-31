package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.domain.model.QuotationItem;
import com.reparando.platform.domain.model.WorkMaterial;
import com.reparando.platform.domain.model.WorkOrder;
import com.reparando.platform.domain.model.WorkStatus;
import com.reparando.platform.domain.port.in.WorkWorkflowUseCase;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workflow")
@Validated
public class WorkWorkflowController {

    private final WorkWorkflowUseCase workWorkflowUseCase;

    public WorkWorkflowController(WorkWorkflowUseCase workWorkflowUseCase) {
        this.workWorkflowUseCase = workWorkflowUseCase;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<WorkOrder> createWorkOrder(@RequestBody @Valid CreateWorkOrderRequest request) {
        return workWorkflowUseCase.createWorkOrder(
            request.clientId(),
            request.workerId(),
            request.description(),
            request.category()
        );
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

    // Diagnostic endpoints
    @PostMapping("/{workOrderId}/diagnostic")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<WorkOrder> submitDiagnostic(
        @PathVariable UUID workOrderId,
        @RequestBody @Valid SubmitDiagnosticRequest request
    ) {
        return workWorkflowUseCase.submitDiagnostic(workOrderId, request.summary(), request.photoUrls());
    }

    @GetMapping("/{workOrderId}/diagnostic")
    @ResponseStatus(HttpStatus.OK)
    public Mono<WorkOrder> getDiagnostic(@PathVariable UUID workOrderId) {
        return workWorkflowUseCase.getDiagnostic(workOrderId);
    }

    // Quotation endpoints
    @PostMapping("/{workOrderId}/quotation")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<WorkOrder> submitQuotation(
        @PathVariable UUID workOrderId,
        @RequestBody @Valid SubmitQuotationRequest request
    ) {
        return workWorkflowUseCase.submitQuotation(
            workOrderId,
            request.workerId(),
            request.laborCost(),
            request.materialsCost(),
            request.items()
        );
    }

    @GetMapping("/{workOrderId}/quotation")
    @ResponseStatus(HttpStatus.OK)
    public Mono<WorkOrder> getQuotation(@PathVariable UUID workOrderId) {
        return workWorkflowUseCase.getQuotation(workOrderId);
    }

    @PostMapping("/{workOrderId}/quotation/approve")
    @ResponseStatus(HttpStatus.OK)
    public Mono<WorkOrder> approveQuotation(
        @PathVariable UUID workOrderId,
        @RequestBody @Valid ApproveQuotationRequest request
    ) {
        return workWorkflowUseCase.approveQuotation(workOrderId, request.clientId());
    }

    // Work notes endpoints
    @PostMapping("/{workOrderId}/work-notes")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<WorkOrder> addWorkNote(
        @PathVariable UUID workOrderId,
        @RequestBody @Valid AddWorkNoteRequest request
    ) {
        return workWorkflowUseCase.addWorkNote(
            workOrderId,
            request.description(),
            request.additionalCost(),
            request.evidencePhotos()
        );
    }

    @PostMapping("/{workOrderId}/work-notes/{noteIndex}/approve")
    @ResponseStatus(HttpStatus.OK)
    public Mono<WorkOrder> approveWorkNote(
        @PathVariable UUID workOrderId,
        @PathVariable int noteIndex,
        @RequestBody @Valid ApproveWorkNoteRequest request
    ) {
        return workWorkflowUseCase.approveWorkNote(workOrderId, noteIndex, request.clientId());
    }

    @PostMapping("/{workOrderId}/work-notes/{noteIndex}/reject")
    @ResponseStatus(HttpStatus.OK)
    public Mono<WorkOrder> rejectWorkNote(
        @PathVariable UUID workOrderId,
        @PathVariable int noteIndex,
        @RequestBody @Valid ApproveWorkNoteRequest request
    ) {
        return workWorkflowUseCase.rejectWorkNote(workOrderId, noteIndex, request.clientId());
    }

    // Completion endpoints
    @PostMapping("/{workOrderId}/complete")
    @ResponseStatus(HttpStatus.OK)
    public Mono<WorkOrder> completeWork(
        @PathVariable UUID workOrderId,
        @RequestBody @Valid CompleteWorkRequest request
    ) {
        return workWorkflowUseCase.completeWork(workOrderId, request.completionPhotos());
    }

    // Rating endpoints
    @PostMapping("/{workOrderId}/rating")
    @ResponseStatus(HttpStatus.OK)
    public Mono<WorkOrder> submitRating(
        @PathVariable UUID workOrderId,
        @RequestBody @Valid SubmitRatingRequest request
    ) {
        return workWorkflowUseCase.submitRating(workOrderId, request.rating(), request.review());
    }

    public record MoveStatusRequest(@NotNull WorkStatus newStatus) {
    }

    public record CreateWorkOrderRequest(
        @NotNull UUID clientId,
        @NotNull UUID workerId,
        @NotBlank String description,
        @NotBlank String category
    ) {
    }

    public record AddMaterialRequest(
        @NotNull UUID workerId,
        @NotBlank String name,
        @NotNull @Min(1) Integer quantity,
        @NotNull @DecimalMin("0.01") BigDecimal unitCost
    ) {
    }

    public record SubmitDiagnosticRequest(
        @NotBlank String summary,
        @NotEmpty List<String> photoUrls
    ) {
    }

    public record SubmitQuotationRequest(
        @NotNull UUID workerId,
        @NotNull @DecimalMin("0") BigDecimal laborCost,
        @NotNull @DecimalMin("0") BigDecimal materialsCost,
        @NotEmpty List<QuotationItem> items
    ) {
    }

    public record ApproveQuotationRequest(@NotNull UUID clientId) {
    }

    public record AddWorkNoteRequest(
        @NotBlank String description,
        @NotNull @DecimalMin("0") BigDecimal additionalCost,
        String evidencePhotos
    ) {
    }

    public record ApproveWorkNoteRequest(@NotNull UUID clientId) {
    }

    public record CompleteWorkRequest(
        @NotEmpty List<String> completionPhotos
    ) {
    }

    public record SubmitRatingRequest(
        @NotNull @DecimalMin("0") @DecimalMax("5") BigDecimal rating,
        String review
    ) {
    }
}
