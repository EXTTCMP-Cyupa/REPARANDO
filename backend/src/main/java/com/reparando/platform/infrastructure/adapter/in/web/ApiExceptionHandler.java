package com.reparando.platform.infrastructure.adapter.in.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Mono<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return Mono.just(new ErrorResponse("BAD_REQUEST", ex.getMessage(), OffsetDateTime.now().toString()));
    }

    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Mono<ErrorResponse> handleIllegalState(IllegalStateException ex) {
        return Mono.just(new ErrorResponse("CONFLICT", ex.getMessage(), OffsetDateTime.now().toString()));
    }

    public record ErrorResponse(String code, String message, String timestamp) {
    }
}
