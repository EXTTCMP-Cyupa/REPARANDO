package com.reparando.platform.infrastructure.adapter.out.storage;

import com.reparando.platform.domain.port.out.ImageStoragePort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
public class LocalImageStorageAdapter implements ImageStoragePort {

    private final Path storagePath;

    public LocalImageStorageAdapter(@Value("${app.business.storage-path}") String storagePath) {
        this.storagePath = Path.of(storagePath);
    }

    @Override
    public Mono<String> store(byte[] content, String fileName) {
        return Mono.fromCallable(() -> {
                Files.createDirectories(storagePath);
                Path destination = storagePath.resolve(fileName);
                Files.write(destination, content);
                return destination.toString();
            })
            .subscribeOn(Schedulers.boundedElastic())
            .onErrorMap(IOException.class, ex -> new IllegalStateException("Unable to store image", ex));
    }
}
