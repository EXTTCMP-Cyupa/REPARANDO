package com.reparando.platform.domain.port.out;

import reactor.core.publisher.Mono;

public interface ImageStoragePort {
    Mono<String> store(byte[] content, String fileName);
}
