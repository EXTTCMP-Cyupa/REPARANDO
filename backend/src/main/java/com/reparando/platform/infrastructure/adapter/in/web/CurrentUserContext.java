package com.reparando.platform.infrastructure.adapter.in.web;

import com.reparando.platform.infrastructure.config.JwtPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import reactor.core.publisher.Mono;

import java.util.UUID;

public final class CurrentUserContext {

    private CurrentUserContext() {
    }

    public static Mono<JwtPrincipal> require() {
        return ReactiveSecurityContextHolder.getContext()
            .map(sc -> sc.getAuthentication())
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Authenticated user is required")))
            .flatMap(CurrentUserContext::extractPrincipal);
    }

    private static Mono<JwtPrincipal> extractPrincipal(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return Mono.error(new IllegalArgumentException("Authenticated user is required"));
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof JwtPrincipal jwtPrincipal) {
            return Mono.just(jwtPrincipal);
        }
        return Mono.error(new IllegalArgumentException("Invalid authenticated user context"));
    }

    public static boolean isAdmin(JwtPrincipal principal) {
        return "ADMIN".equals(principal.role());
    }

    public static boolean hasRole(JwtPrincipal principal, String role) {
        return role.equals(principal.role());
    }

    public static Mono<Void> requireSelfOrAdmin(JwtPrincipal principal, UUID resourceUserId) {
        if (isAdmin(principal) || principal.userId().equals(resourceUserId)) {
            return Mono.empty();
        }
        return Mono.error(new IllegalArgumentException("You are not allowed to access resources of another user"));
    }
}
