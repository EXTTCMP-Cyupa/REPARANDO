package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.domain.model.ProfessionalProfile;
import com.reparando.platform.domain.model.WorkOrder;
import com.reparando.platform.domain.port.in.FinancialManagementUseCase;
import com.reparando.platform.domain.port.in.MarketplaceUseCase;
import com.reparando.platform.domain.port.in.WorkWorkflowUseCase;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/marketplace")
@Validated
public class MarketplaceController {

    private final MarketplaceUseCase marketplaceUseCase;
    private final FinancialManagementUseCase financialManagementUseCase;
    private final WorkWorkflowUseCase workWorkflowUseCase;

    public MarketplaceController(
        MarketplaceUseCase marketplaceUseCase,
        FinancialManagementUseCase financialManagementUseCase,
        WorkWorkflowUseCase workWorkflowUseCase
    ) {
        this.marketplaceUseCase = marketplaceUseCase;
        this.financialManagementUseCase = financialManagementUseCase;
        this.workWorkflowUseCase = workWorkflowUseCase;
    }

    @GetMapping("/professionals")
    @ResponseStatus(HttpStatus.OK)
    public Flux<ProfessionalProfile> search(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) Double minRating,
        @RequestParam(required = false) Double nearLat,
        @RequestParam(required = false) Double nearLng,
        @RequestParam(required = false) Double maxKm
    ) {
        return marketplaceUseCase.search(category, minRating, nearLat, nearLng, maxKm);
    }

    @PostMapping("/contact")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<WorkOrder> contactAndCreateWorkOrder(@RequestBody @Valid ContactRequest request) {
        return financialManagementUseCase.chargeLead(request.workerId(), request.clientId(), "MARKETPLACE_DIRECT_CONTACT")
            .then(workWorkflowUseCase.createWorkOrder(
                request.clientId(),
                request.workerId(),
                request.description(),
                request.category()
            ));
    }

    public record ContactRequest(
        @NotNull UUID clientId,
        @NotNull UUID workerId,
        @NotBlank String description,
        @NotBlank String category
    ) {
    }
}
