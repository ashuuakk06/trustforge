package com.trustforge.api;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException exception, HttpServletRequest request) { return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Check the request fields", request.getRequestURI()); }
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException exception, HttpServletRequest request) { return error(HttpStatus.valueOf(exception.getStatusCode().value()), "REQUEST_REJECTED", exception.getReason(), request.getRequestURI()); }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<?> denied(AccessDeniedException exception, HttpServletRequest request) { return error(HttpStatus.FORBIDDEN, "FORBIDDEN", exception.getMessage(), request.getRequestURI()); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> generic(Exception exception, HttpServletRequest request) { return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "The request could not be completed", request.getRequestURI()); }
    private ResponseEntity<?> error(HttpStatus status, String code, String message, String path) { return ResponseEntity.status(status).body(Map.of("timestamp", OffsetDateTime.now().toString(), "status", status.value(), "error", code, "message", message == null ? "Request rejected" : message, "path", path)); }
}
