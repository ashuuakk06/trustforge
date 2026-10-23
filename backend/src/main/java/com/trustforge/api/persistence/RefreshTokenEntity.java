package com.trustforge.api.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "refresh_tokens")
public class RefreshTokenEntity {
    @Id private String id;
    @Column(name = "user_id", nullable = false) private String userId;
    @Column(name = "family_id", nullable = false) private String familyId;
    @Column(name = "token_hash", nullable = false, unique = true) private String tokenHash;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "used_at") private Instant usedAt;
    @Column(name = "revoked_at") private Instant revokedAt;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    protected RefreshTokenEntity() {}
    public RefreshTokenEntity(String id, String userId, String familyId, String tokenHash, Instant expiresAt) {
        this.id = id; this.userId = userId; this.familyId = familyId; this.tokenHash = tokenHash; this.expiresAt = expiresAt;
    }
    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getFamilyId() { return familyId; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getUsedAt() { return usedAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public void markUsed() { this.usedAt = Instant.now(); }
    public void markRevoked() { this.revokedAt = Instant.now(); }
}
