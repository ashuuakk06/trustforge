package com.trustforge.api.web;

import com.trustforge.api.persistence.UserEntity;
import com.trustforge.api.security.AuthService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth = auth; }

    @PostMapping("/login") public Map<String, Object> login(@Valid @RequestBody ApiDtos.Credentials body) { return auth.login(body.email(), body.password()); }
    @PostMapping("/register") public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody ApiDtos.Registration body) { return ResponseEntity.status(HttpStatus.CREATED).body(auth.register(body.email(), body.name(), body.password())); }
    @PostMapping("/refresh") public Map<String, Object> refresh(@Valid @RequestBody ApiDtos.RefreshRequest body) { return auth.rotate(body.refreshToken()); }
    @PostMapping("/logout") public ResponseEntity<Void> logout(@RequestBody(required = false) ApiDtos.RefreshRequest body) { if (body != null) auth.logout(body.refreshToken()); return ResponseEntity.noContent().build(); }
    @GetMapping("/me") public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) { UserEntity user = auth.current(jwt.getSubject()); return auth.publicUser(user); }
}
