package com.reparando.platform.domain.port.in;

import com.reparando.platform.domain.model.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface WorkWorkflowUseCase {
    Mono<WorkOrder> createWorkOrder(UUID clientId, UUID workerId, String description, String category);
    Mono<WorkOrder> moveWorkStatus(UUID workOrderId, WorkStatus newStatus);
    Flux<WorkOrder> listWorkerOrders(UUID workerId);
    Flux<WorkOrder> listClientOrders(UUID clientId);
    Mono<WorkMaterial> addMaterial(UUID workOrderId, UUID workerId, String name, int quantity, BigDecimal unitCost);
    Flux<WorkMaterial> listMaterials(UUID workOrderId);
    
    // Diagnostic workflow
    Mono<WorkOrder> submitDiagnostic(UUID workOrderId, String summary, List<String> photoUrls);
    Mono<WorkOrder> getDiagnostic(UUID workOrderId);
    
    // Quotation workflow
    Mono<WorkOrder> submitQuotation(UUID workOrderId, UUID workerId, BigDecimal laborCost, BigDecimal materialsCost, List<QuotationItem> items);
    Mono<WorkOrder> getQuotation(UUID workOrderId);
    Mono<WorkOrder> approveQuotation(UUID workOrderId, UUID clientId);
    
    // Work notes (unforeseen costs)
    Mono<WorkOrder> addWorkNote(UUID workOrderId, String description, BigDecimal additionalCost, String evidencePhotos);
    Mono<WorkOrder> approveWorkNote(UUID workOrderId, int noteIndex, UUID clientId);
    Mono<WorkOrder> rejectWorkNote(UUID workOrderId, int noteIndex, UUID clientId);
    
    // Completion & rating
    Mono<WorkOrder> completeWork(UUID workOrderId, List<String> completionPhotos);
    Mono<WorkOrder> submitRating(UUID workOrderId, BigDecimal rating, String review);
}
