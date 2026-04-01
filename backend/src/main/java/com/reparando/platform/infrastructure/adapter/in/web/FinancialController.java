package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.domain.model.DepositReceipt;
import com.reparando.platform.domain.model.LedgerEntry;
import com.reparando.platform.domain.model.PaymentMethod;
import com.reparando.platform.domain.model.WorkerAccount;
import com.reparando.platform.domain.port.in.FinancialManagementUseCase;
import com.reparando.platform.domain.port.out.ImageStoragePort;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.codec.multipart.FilePart;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance")
@Validated
public class FinancialController {

    private final FinancialManagementUseCase financialManagementUseCase;
    private final ImageStoragePort imageStoragePort;

    public FinancialController(FinancialManagementUseCase financialManagementUseCase, ImageStoragePort imageStoragePort) {
        this.financialManagementUseCase = financialManagementUseCase;
        this.imageStoragePort = imageStoragePort;
    }

    @GetMapping("/workers/{workerId}/account")
    @ResponseStatus(HttpStatus.OK)
    public Mono<WorkerAccount> getWorkerAccount(@PathVariable UUID workerId) {
        return CurrentUserContext.require()
            .flatMap(currentUser -> CurrentUserContext.requireSelfOrAdmin(currentUser, workerId)
                .then(financialManagementUseCase.getWorkerAccount(workerId))
            );
    }

    @PostMapping("/lead/charge")
    @ResponseStatus(HttpStatus.OK)
    public Mono<WorkerAccount> chargeLead(@RequestBody ChargeLeadRequest request) {
        return CurrentUserContext.require()
            .flatMap(currentUser -> {
                if (!CurrentUserContext.isAdmin(currentUser)) {
                    return Mono.error(new IllegalArgumentException("Only admins can manually charge leads"));
                }
                return financialManagementUseCase.chargeLead(request.workerId(), request.clientId(), request.source());
            });
    }

    @PostMapping("/deposit")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<DepositReceipt> submitDeposit(@RequestBody DepositRequest request) {
        return CurrentUserContext.require()
            .flatMap(currentUser -> {
                UUID effectiveWorkerId = request.workerId() == null ? currentUser.userId() : request.workerId();
                return CurrentUserContext.requireSelfOrAdmin(currentUser, effectiveWorkerId)
                    .then(financialManagementUseCase.submitDepositReceipt(
                        effectiveWorkerId,
                        request.amount(),
                        request.paymentMethod(),
                        request.imagePath()
                    ));
            });
    }

    @PostMapping("/deposit/{depositId}/approve")
    @ResponseStatus(HttpStatus.OK)
    public Mono<DepositReceipt> approveDeposit(@PathVariable UUID depositId, @RequestBody ApproveDepositRequest request) {
        return CurrentUserContext.require()
            .flatMap(currentUser -> {
                if (!CurrentUserContext.isAdmin(currentUser)) {
                    return Mono.error(new IllegalArgumentException("Only admins can approve deposits"));
                }
                UUID effectiveAdminId = request.adminId() == null ? currentUser.userId() : request.adminId();
                if (!effectiveAdminId.equals(currentUser.userId())) {
                    return Mono.error(new IllegalArgumentException("Admin ID does not match authenticated user"));
                }
                return financialManagementUseCase.approveDeposit(depositId, effectiveAdminId);
            });
    }

    @PostMapping("/deposit/{depositId}/reject")
    @ResponseStatus(HttpStatus.OK)
    public Mono<DepositReceipt> rejectDeposit(@PathVariable UUID depositId, @RequestBody ApproveDepositRequest request) {
        return CurrentUserContext.require()
            .flatMap(currentUser -> {
                if (!CurrentUserContext.isAdmin(currentUser)) {
                    return Mono.error(new IllegalArgumentException("Only admins can reject deposits"));
                }
                UUID effectiveAdminId = request.adminId() == null ? currentUser.userId() : request.adminId();
                if (!effectiveAdminId.equals(currentUser.userId())) {
                    return Mono.error(new IllegalArgumentException("Admin ID does not match authenticated user"));
                }
                return financialManagementUseCase.rejectDeposit(depositId, effectiveAdminId);
            });
    }

    @GetMapping("/deposit/pending")
    @ResponseStatus(HttpStatus.OK)
    public Flux<DepositReceipt> listPendingDeposits() {
        return financialManagementUseCase.listPendingDeposits();
    }

    @GetMapping("/workers/{workerId}/deposits")
    @ResponseStatus(HttpStatus.OK)
    public Flux<DepositReceipt> listWorkerDeposits(@PathVariable UUID workerId) {
        return CurrentUserContext.require()
            .flatMapMany(currentUser -> CurrentUserContext.requireSelfOrAdmin(currentUser, workerId)
                .thenMany(financialManagementUseCase.listWorkerDeposits(workerId))
            );
    }

    @GetMapping("/workers/{workerId}/ledger")
    @ResponseStatus(HttpStatus.OK)
    public Flux<LedgerEntry> listWorkerLedger(@PathVariable UUID workerId) {
        return CurrentUserContext.require()
            .flatMapMany(currentUser -> CurrentUserContext.requireSelfOrAdmin(currentUser, workerId)
                .thenMany(financialManagementUseCase.listWorkerLedger(workerId))
            );
    }

    @PostMapping("/ledger/adjustments")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<LedgerEntry> createAdjustment(@RequestBody AdjustmentRequest request) {
        return CurrentUserContext.require()
            .flatMap(currentUser -> {
                if (!CurrentUserContext.isAdmin(currentUser)) {
                    return Mono.error(new IllegalArgumentException("Only admins can create adjustments"));
                }
                UUID effectiveAdminId = request.adminId() == null ? currentUser.userId() : request.adminId();
                if (!effectiveAdminId.equals(currentUser.userId())) {
                    return Mono.error(new IllegalArgumentException("Admin ID does not match authenticated user"));
                }
                return financialManagementUseCase.createAdjustment(
                    request.workerId(),
                    request.amount(),
                    request.reason(),
                    effectiveAdminId
                );
            });
    }

    @PostMapping("/ledger/{entryId}/refund")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<LedgerEntry> refundLedgerEntry(@PathVariable UUID entryId, @RequestBody RefundRequest request) {
        return CurrentUserContext.require()
            .flatMap(currentUser -> {
                if (!CurrentUserContext.isAdmin(currentUser)) {
                    return Mono.error(new IllegalArgumentException("Only admins can issue refunds"));
                }
                UUID effectiveAdminId = request.adminId() == null ? currentUser.userId() : request.adminId();
                if (!effectiveAdminId.equals(currentUser.userId())) {
                    return Mono.error(new IllegalArgumentException("Admin ID does not match authenticated user"));
                }
                return financialManagementUseCase.refundLedgerEntry(entryId, request.reason(), effectiveAdminId);
            });
    }

    @PostMapping("/deposit/upload")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<UploadResponse> uploadDepositImage(@RequestPart("file") Mono<FilePart> filePartMono) {
        return filePartMono.flatMap(filePart -> filePart.content()
            .reduce(new java.io.ByteArrayOutputStream(), (stream, dataBuffer) -> {
                byte[] bytes = new byte[dataBuffer.readableByteCount()];
                dataBuffer.read(bytes);
                org.springframework.core.io.buffer.DataBufferUtils.release(dataBuffer);
                stream.write(bytes, 0, bytes.length);
                return stream;
            })
            .flatMap(stream -> {
                String filename = java.util.UUID.randomUUID() + "-" + filePart.filename();
                return imageStoragePort.store(stream.toByteArray(), filename)
                    .map(UploadResponse::new);
            })
        );
    }

    public record ChargeLeadRequest(
        @NotNull UUID workerId,
        @NotNull UUID clientId,
        @NotBlank String source
    ) {
    }

    public record DepositRequest(
        UUID workerId,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull PaymentMethod paymentMethod,
        @NotBlank String imagePath
    ) {
    }

    public record ApproveDepositRequest(
        UUID adminId
    ) {
    }

    public record AdjustmentRequest(
        @NotNull UUID workerId,
        @NotNull BigDecimal amount,
        @NotBlank String reason,
        UUID adminId
    ) {
    }

    public record RefundRequest(
        String reason,
        UUID adminId
    ) {
    }

    public record UploadResponse(String imagePath) {
    }
}
