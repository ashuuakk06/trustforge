package com.trustforge.api.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "audit_events")
public class AuditEventEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long sequence;
    @Column(nullable = false, unique = true) private String id;
    @Column(nullable = false) private String actor;
    @Column(nullable = false) private String action;
    @Column(nullable = false) private String entity;
    @Column(name = "request_id", nullable = false) private String requestId;
    @Column(name = "previous_hash", nullable = false) private String previousHash;
    @Column(name = "current_hash", nullable = false) private String currentHash;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb", nullable = false) private Map<String, Object> payload;
    @Column(name = "verification_status", nullable = false) private String verificationStatus = "VERIFIED";
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    protected AuditEventEntity() {}
    public AuditEventEntity(String id, String actor, String action, String entity, String requestId, String previousHash, String currentHash, Map<String, Object> payload) {
        this.id = id; this.actor = actor; this.action = action; this.entity = entity; this.requestId = requestId; this.previousHash = previousHash; this.currentHash = currentHash; this.payload = payload;
    }
    public Long getSequence() { return sequence; }
    public String getId() { return id; }
    public String getActor() { return actor; }
    public String getAction() { return action; }
    public String getEntity() { return entity; }
    public String getRequestId() { return requestId; }
    public String getPreviousHash() { return previousHash; }
    public String getCurrentHash() { return currentHash; }
    public Map<String, Object> getPayload() { return payload; }
    public String getVerificationStatus() { return verificationStatus; }
    public Instant getCreatedAt() { return createdAt; }
}
