package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.domain.model.BusinessPolicy;
import com.reparando.platform.domain.port.in.AdminSettingsUseCase;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/admin/settings")
@Validated
public class AdminSettingsController {

    private final AdminSettingsUseCase adminSettingsUseCase;

    public AdminSettingsController(AdminSettingsUseCase adminSettingsUseCase) {
        this.adminSettingsUseCase = adminSettingsUseCase;
    }

    @GetMapping("/business-policy")
    @ResponseStatus(HttpStatus.OK)
    public Mono<BusinessPolicy> getBusinessPolicy() {
        return adminSettingsUseCase.getBusinessPolicy();
    }

    @PutMapping("/business-policy")
    @ResponseStatus(HttpStatus.OK)
    public Mono<BusinessPolicy> updateBusinessPolicy(@RequestBody UpdateBusinessPolicyRequest request) {
        return adminSettingsUseCase.updateBusinessPolicy(request.leadCost(), request.trustCreditLimit());
    }

    public record UpdateBusinessPolicyRequest(
        @NotNull @DecimalMin(value = "0.01") BigDecimal leadCost,
        @NotNull BigDecimal trustCreditLimit
    ) {
    }
}
