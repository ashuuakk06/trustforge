package com.trustforge.api;

import com.trustforge.security.TokenService;
import com.trustforge.store.TrustForgeStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final TrustForgeStore store;
    private final TokenService tokens;
    public AuthController(TrustForgeStore store, TokenService tokens) { this.store = store; this.tokens = tokens; }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record RegisterRequest(@Email @NotBlank String email, @NotBlank String name, @Size(min = 8, max = 128) String password) {}
    public record RefreshRequest(@NotBlank String refreshToken) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        TrustForgeStore.User user = store.user(request.email().toLowerCase());
        if (user == null || !user.active() || !store.passwordEncoder().matches(request.password(), user.passwordHash())) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "INVALID_CREDENTIALS", "message", "Email or password is incorrect"));
        return ResponseEntity.ok(issue(user));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try { return ResponseEntity.status(HttpStatus.CREATED).body(issue(store.register(request.email().toLowerCase(), request.name(), request.password()))); }
        catch (IllegalArgumentException e) { return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "ACCOUNT_EXISTS", "message", e.getMessage())); }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshRequest request) {
        var claims = tokens.verify(request.refreshToken(), "refresh");
        String tokenId = tokens.tokenId(request.refreshToken()); String email = String.valueOf(claims.getOrDefault("sub", ""));
        if (claims.isEmpty() || !store.consumeRefresh(tokenId, email)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "REFRESH_REVOKED", "message", "Refresh token is invalid, expired, or already rotated"));
        TrustForgeStore.User user = store.user(email); return ResponseEntity.ok(issue(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) RefreshRequest request) { if (request != null && request.refreshToken() != null) store.revokeRefresh(tokens.tokenId(request.refreshToken())); return ResponseEntity.noContent().build(); }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) { TrustForgeStore.User user = store.user(authentication.getName()); return ResponseEntity.ok(userView(user)); }

    private Map<String, Object> issue(TrustForgeStore.User user) {
        String access = tokens.accessToken(user.email(), user.role()); String refresh = tokens.refreshToken(user.email()); store.rememberRefresh(tokens.tokenId(refresh), user.email());
        return Map.of("accessToken", access, "refreshToken", refresh, "expiresIn", 1800, "user", userView(user));
    }
    private Map<String, Object> userView(TrustForgeStore.User user) { return Map.of("email", user.email(), "name", user.name(), "role", user.role(), "active", user.active()); }
}
