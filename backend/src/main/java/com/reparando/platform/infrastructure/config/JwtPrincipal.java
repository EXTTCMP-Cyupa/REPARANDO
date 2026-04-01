package com.reparando.platform.infrastructure.config;

import java.util.UUID;

public record JwtPrincipal(UUID userId, String email, String role) {
}
