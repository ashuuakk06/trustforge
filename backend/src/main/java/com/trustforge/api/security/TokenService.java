package com.trustforge.api.security;

import com.trustforge.api.persistence.UserEntity;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

@Service
public class TokenService {
    private final JwtEncoder encoder;
    private final long accessMinutes;
    public TokenService(JwtEncoder encoder, @Value("${trustforge.jwt.access-minutes}") long accessMinutes) { this.encoder = encoder; this.accessMinutes = accessMinutes; }
    public String accessToken(UserEntity user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer("trustforge").issuedAt(now).expiresAt(now.plus(accessMinutes, ChronoUnit.MINUTES))
            .subject(user.getId()).claim("email", user.getEmail()).claim("role", user.getRole()).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
