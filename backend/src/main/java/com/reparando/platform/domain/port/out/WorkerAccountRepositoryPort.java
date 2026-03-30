package com.reparando.platform.domain.port.out;

import com.reparando.platform.domain.model.WorkerAccount;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface WorkerAccountRepositoryPort {
    Mono<WorkerAccount> findWorkerById(UUID workerId);
    Mono<WorkerAccount> save(WorkerAccount workerAccount);
}
