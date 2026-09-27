package com.trustforge.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trustforge.config.TrustForgeProperties;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class TokenService {
    private final ObjectMapper mapper;
    private final TrustForgeProperties properties;
    private final Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
    private final Base64.Decoder decoder = Base64.getUrlDecoder();

    public TokenService(ObjectMapper mapper, TrustForgeProperties properties) {
        this.mapper = mapper;
        this.properties = properties;
    }

    public String accessToken(String email, String role) {
        long now = Instant.now().getEpochSecond();
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", email);
        claims.put("role", role);
        claims.put("type", "access");
        claims.put("iat", now);
        claims.put("exp", now + properties.accessTokenMinutes() * 60);
        claims.put("jti", UUID.randomUUID().toString());
        return encode(claims);
    }

    public String refreshToken(String email) {
        long now = Instant.now().getEpochSecond();
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", email);
        claims.put("type", "refresh");
        claims.put("iat", now);
        claims.put("exp", now + properties.refreshTokenDays() * 86400);
        claims.put("jti", UUID.randomUUID().toString());
        return encode(claims);
    }

    public Map<String, Object> verify(String token, String expectedType) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3 || !constantTime(parts[2], sign(parts[0] + "." + parts[1]))) return Map.of();
            Map<String, Object> claims = mapper.readValue(decoder.decode(parts[1]), new TypeReference<>() {});
            long exp = ((Number) claims.getOrDefault("exp", 0)).longValue();
            if (exp <= Instant.now().getEpochSecond() || !expectedType.equals(claims.get("type"))) return Map.of();
            return claims;
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    public String tokenId(String token) {
        Map<String, Object> claims = verify(token, "refresh");
        return String.valueOf(claims.getOrDefault("jti", ""));
    }

    private String encode(Map<String, Object> claims) {
        try {
            String header = encoder.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
            String body = encoder.encodeToString(mapper.writeValueAsBytes(claims));
            return header + "." + body + "." + sign(header + "." + body);
        } catch (Exception e) { throw new IllegalStateException("Could not create token", e); }
    }

    private String sign(String input) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(properties.jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return encoder.encodeToString(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
    }

    private boolean constantTime(String a, String b) {
        return java.security.MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
