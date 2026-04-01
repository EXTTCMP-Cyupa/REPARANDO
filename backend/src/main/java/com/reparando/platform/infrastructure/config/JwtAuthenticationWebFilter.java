package com.reparando.platform.infrastructure.config;

import io.jsonwebtoken.Claims;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtAuthenticationWebFilter implements WebFilter {

    private final JwtService jwtService;

    public JwtAuthenticationWebFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return chain.filter(exchange);
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = jwtService.parseToken(token);
            String subject = claims.getSubject();
            String role = String.valueOf(claims.get("role"));
            UUID userId = resolveUserId(claims, subject);
            JwtPrincipal principal = new JwtPrincipal(userId, subject, role);

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))
            );

            SecurityContextImpl context = new SecurityContextImpl(authentication);
            return chain.filter(exchange)
                .contextWrite(ReactiveSecurityContextHolder.withSecurityContext(Mono.just(context)));
        } catch (Exception ignored) {
            return chain.filter(exchange);
        }
    }

    private UUID resolveUserId(Claims claims, String subject) {
        Object userIdClaim = claims.get("userId");
        if (userIdClaim != null) {
            return UUID.fromString(userIdClaim.toString());
        }

        Map<String, UUID> fallback = Map.of(
            "admin@reparando.app", UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            "worker@reparando.app", UUID.fromString("11111111-1111-1111-1111-111111111111"),
            "worker2@reparando.app", UUID.fromString("44444444-4444-4444-4444-444444444444"),
            "client@reparando.app", UUID.fromString("33333333-3333-3333-3333-333333333333")
        );
        UUID fallbackUserId = fallback.get(subject);
        if (fallbackUserId == null) {
            throw new IllegalArgumentException("Token does not contain a valid userId");
        }
        return fallbackUserId;
    }
}
