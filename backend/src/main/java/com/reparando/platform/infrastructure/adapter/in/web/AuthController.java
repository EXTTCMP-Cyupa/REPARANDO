package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.infrastructure.config.JwtService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@Validated
public class AuthController {

    private final JwtService jwtService;

    public AuthController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public Mono<LoginResponse> login(@RequestBody LoginRequest request) {
        Map<String, String> users = Map.of(
            "admin@reparando.app", "ADMIN",
            "worker@reparando.app", "WORKER",
            "worker2@reparando.app", "WORKER",
            "client@reparando.app", "CLIENT"
        );
        Map<String, UUID> userIds = Map.of(
            "admin@reparando.app", UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            "worker@reparando.app", UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "worker2@reparando.app", UUID.fromString("44444444-4444-4444-4444-444444444444"),
            "client@reparando.app", UUID.fromString("33333333-3333-3333-3333-333333333333")
        );

        String role = users.get(request.email());
        if (role == null || !"123456".equals(request.password())) {
            return Mono.error(new IllegalArgumentException("Invalid credentials"));
        }
        UUID userId = userIds.get(request.email());
        if (userId == null) {
            return Mono.error(new IllegalArgumentException("Invalid credentials"));
        }

        String token = jwtService.generateToken(request.email(), role);
        return Mono.just(new LoginResponse(token, role, userId));
    }

    public record LoginRequest(
        @NotBlank String email,
        @NotBlank String password
    ) {
    }

    public record LoginResponse(String accessToken, String role, UUID userId) {
    }
}
