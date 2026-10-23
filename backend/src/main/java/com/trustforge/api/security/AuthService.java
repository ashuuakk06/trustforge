package com.trustforge.api.security;

import com.trustforge.api.persistence.RefreshTokenEntity;
import com.trustforge.api.persistence.RefreshTokenRepository;
import com.trustforge.api.persistence.UserEntity;
import com.trustforge.api.persistence.UserRepository;
import com.trustforge.api.web.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final long refreshDays;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder passwords, TokenService tokens,
                       @Value("${trustforge.jwt.refresh-days}") long refreshDays) {
        this.users = users; this.refreshTokens = refreshTokens; this.passwords = passwords; this.tokens = tokens; this.refreshDays = refreshDays;
    }

    @Transactional
    public Map<String, Object> login(String email, String password) {
        UserEntity user = users.findByEmailIgnoreCase(email.trim()).orElseThrow(() -> ApiException.unauthorized("Email or password is incorrect"));
        if (!user.isActive() || !passwords.matches(password, user.getPasswordHash())) throw ApiException.unauthorized("Email or password is incorrect");
        return session(user, UUID.randomUUID().toString());
    }

    @Transactional
    public Map<String, Object> register(String email, String name, String password) {
        if (users.findByEmailIgnoreCase(email.trim()).isPresent()) throw ApiException.conflict("An account with that email already exists");
        UserEntity user = users.save(new UserEntity("USR-" + UUID.randomUUID(), email.trim().toLowerCase(), name.trim(), "PARTICIPANT", passwords.encode(password)));
        return session(user, UUID.randomUUID().toString());
    }

    @Transactional
    public Map<String, Object> rotate(String rawToken) {
        String tokenHash = sha256(rawToken);
        RefreshTokenEntity stored = refreshTokens.findByTokenHash(tokenHash).orElseThrow(() -> ApiException.unauthorized("Refresh token is invalid"));
        if (stored.getUsedAt() != null || stored.getRevokedAt() != null) {
            refreshTokens.findByFamilyId(stored.getFamilyId()).forEach(RefreshTokenEntity::markRevoked);
            throw ApiException.unauthorized("Refresh token reuse detected; sign in again");
        }
        if (stored.getExpiresAt().isBefore(Instant.now())) { stored.markRevoked(); throw ApiException.unauthorized("Refresh token has expired"); }
        UserEntity user = users.findById(stored.getUserId()).orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
        stored.markUsed();
        refreshTokens.save(stored);
        return session(user, stored.getFamilyId());
    }

    @Transactional
    public void logout(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        refreshTokens.findByTokenHash(sha256(rawToken)).ifPresent(token -> { token.markRevoked(); refreshTokens.save(token); });
    }

    public UserEntity current(String userId) { return users.findById(userId).orElseThrow(() -> ApiException.unauthorized("Account no longer exists")); }
    public Map<String, Object> publicUser(UserEntity user) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", user.getId()); body.put("email", user.getEmail()); body.put("name", user.getName()); body.put("role", user.getRole()); body.put("active", user.isActive());
        return body;
    }

    private Map<String, Object> session(UserEntity user, String familyId) {
        byte[] bytes = new byte[48]; random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokens.save(new RefreshTokenEntity(UUID.randomUUID().toString(), user.getId(), familyId, sha256(raw), Instant.now().plus(refreshDays, ChronoUnit.DAYS)));
        return Map.of("accessToken", tokens.accessToken(user), "refreshToken", raw, "user", publicUser(user));
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder(); for (byte b : digest) out.append(String.format("%02x", b)); return out.toString();
        } catch (Exception e) { throw new IllegalStateException("SHA-256 is unavailable", e); }
    }
}
