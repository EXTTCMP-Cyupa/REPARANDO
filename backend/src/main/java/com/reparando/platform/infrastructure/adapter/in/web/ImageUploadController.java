package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.domain.port.out.ImageStoragePort;
import jakarta.validation.constraints.NotNull;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.io.ByteArrayOutputStream;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/images")
@Validated
public class ImageUploadController {

    private final ImageStoragePort imageStoragePort;

    public ImageUploadController(ImageStoragePort imageStoragePort) {
        this.imageStoragePort = imageStoragePort;
    }

    @PostMapping("/upload")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ImageUploadResponse> uploadImage(@RequestPart("file") FilePart filePart) {
        if (filePart == null || filePart.filename().isBlank()) {
            return Mono.error(new IllegalArgumentException("File is required"));
        }

        String fileName = UUID.randomUUID() + "_" + sanitizeFileName(filePart.filename());

        return filePart.content()
            .collect(ByteArrayOutputStream::new, (baos, dataBuffer) -> {
                byte[] bytes = new byte[dataBuffer.readableByteCount()];
                dataBuffer.read(bytes);
                DataBufferUtils.release(dataBuffer);
                try {
                    baos.write(bytes);
                } catch (java.io.IOException e) {
                    throw new RuntimeException(e);
                }
            })
            .map(ByteArrayOutputStream::toByteArray)
            .flatMap(fileBytes -> imageStoragePort.store(fileBytes, fileName))
            .map(ImageUploadResponse::new)
            .onErrorMap(Exception.class, ex -> new IllegalStateException("Unable to upload image: " + ex.getMessage(), ex));
    }

    private String sanitizeFileName(String fileName) {
        return fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    public record ImageUploadResponse(@NotNull String url) {
    }
}
