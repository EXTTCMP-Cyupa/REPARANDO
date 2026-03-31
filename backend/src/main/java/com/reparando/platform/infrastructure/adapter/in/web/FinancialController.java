package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.domain.model.DepositReceipt;
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
        return financialManagementUseCase.getWorkerAccount(workerId);
    }

    @PostMapping("/lead/charge")
    @ResponseStatus(HttpStatus.OK)
    public Mono<WorkerAccount> chargeLead(@RequestBody ChargeLeadRequest request) {
        return financialManagementUseCase.chargeLead(request.workerId(), request.clientId(), request.source());
    }

    @PostMapping("/deposit")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<DepositReceipt> submitDeposit(@RequestBody DepositRequest request) {
        return financialManagementUseCase.submitDepositReceipt(
            request.workerId(),
            request.amount(),
            request.paymentMethod(),
            request.imagePath()
        );
    }

    @PostMapping("/deposit/{depositId}/approve")
    @ResponseStatus(HttpStatus.OK)
    public Mono<DepositReceipt> approveDeposit(@PathVariable UUID depositId, @RequestBody ApproveDepositRequest request) {
        return financialManagementUseCase.approveDeposit(depositId, request.adminId());
    }

    @PostMapping("/deposit/{depositId}/reject")
    @ResponseStatus(HttpStatus.OK)
    public Mono<DepositReceipt> rejectDeposit(@PathVariable UUID depositId, @RequestBody ApproveDepositRequest request) {
        return financialManagementUseCase.rejectDeposit(depositId, request.adminId());
    }

    @GetMapping("/deposit/pending")
    @ResponseStatus(HttpStatus.OK)
    public Flux<DepositReceipt> listPendingDeposits() {
        return financialManagementUseCase.listPendingDeposits();
    }

    @GetMapping("/workers/{workerId}/deposits")
    @ResponseStatus(HttpStatus.OK)
    public Flux<DepositReceipt> listWorkerDeposits(@PathVariable UUID workerId) {
        return financialManagementUseCase.listWorkerDeposits(workerId);
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
        @NotNull UUID workerId,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull PaymentMethod paymentMethod,
        @NotBlank String imagePath
    ) {
    }

    public record ApproveDepositRequest(
        @NotNull UUID adminId
    ) {
    }

    public record UploadResponse(String imagePath) {
    }
}
