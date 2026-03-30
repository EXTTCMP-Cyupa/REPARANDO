package com.reparando.platform.domain.port.in;

import com.reparando.platform.domain.model.DepositReceipt;
import com.reparando.platform.domain.model.WorkerAccount;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.UUID;

public interface FinancialManagementUseCase {

    Mono<WorkerAccount> getWorkerAccount(UUID workerId);

    Mono<WorkerAccount> chargeLead(UUID workerId, UUID clientId, String source);

    Mono<DepositReceipt> submitDepositReceipt(UUID workerId, BigDecimal amount, String imagePath);

    Mono<DepositReceipt> approveDeposit(UUID depositId, UUID adminId);

    Mono<DepositReceipt> rejectDeposit(UUID depositId, UUID adminId);

    Flux<DepositReceipt> listPendingDeposits();
}
