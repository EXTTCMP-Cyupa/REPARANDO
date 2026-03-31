package com.reparando.platform.infrastructure.adapter.out.storage;

import com.reparando.platform.domain.port.out.ImageStoragePort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Base64;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "cloudinary", matchIfMissing = false)
public class CloudinaryImageStorageAdapter implements ImageStoragePort {

    private final String cloudName;
    private final String apiKey;

    public CloudinaryImageStorageAdapter(
        @Value("${app.storage.cloudinary.cloud-name}") String cloudName,
        @Value("${app.storage.cloudinary.api-key}") String apiKey,
        @Value("${app.storage.cloudinary.api-secret}") String apiSecret
    ) {
        this.cloudName = cloudName;
        this.apiKey = apiKey;
    }

    @Override
    public Mono<String> store(byte[] content, String fileName) {
        return Mono.fromCallable(() -> {
                String publicId = UUID.randomUUID().toString().replace("-", "");
                String uploadUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload";
                
                String auth = apiKey + ":";
                String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());
                
                HttpURLConnection conn = (HttpURLConnection) new URL(uploadUrl).openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Authorization", "Basic " + encodedAuth);
                conn.setDoOutput(true);
                
                // Prepare multipart form data
                String boundary = "----WebKitFormBoundary" + System.currentTimeMillis();
                conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
                
                try (OutputStream os = conn.getOutputStream()) {
                    String formData = "--" + boundary + "\r\n" +
                        "Content-Disposition: form-data; name=\"file\"; filename=\"" + fileName + "\"\r\n" +
                        "Content-Type: application/octet-stream\r\n\r\n";
                    
                    os.write(formData.getBytes());
                    os.write(content);
                    
                    os.write(("\r\n--" + boundary + "\r\n").getBytes());
                    os.write("Content-Disposition: form-data; name=\"public_id\"\r\n\r\n".getBytes());
                    os.write(publicId.getBytes());
                    
                    os.write(("\r\n--" + boundary + "--\r\n").getBytes());
                    os.flush();
                }
                
                if (conn.getResponseCode() != 200) {
                    throw new IOException("Cloudinary upload failed: " + conn.getResponseCode());
                }
                
                // Parse response - for simplicity, assume URL pattern
                return "https://res.cloudinary.com/" + cloudName + "/image/upload/" + publicId + ".jpg";
            })
            .subscribeOn(Schedulers.boundedElastic())
            .onErrorMap(IOException.class, ex -> new IllegalStateException("Unable to upload to Cloudinary", ex))
            .onErrorMap(Exception.class, ex -> new IllegalStateException("Cloudinary upload failed: " + ex.getMessage(), ex));
    }
}
