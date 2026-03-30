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

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                subject,
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
}
