package com.trustforge.api.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "events")
public class EventEntity {
    @Id private String id;
    @Column(nullable = false) private String name;
    @Column(nullable = false) private String state;
    @Column(name = "starts_at", nullable = false) private Instant startsAt;
    @Column(name = "submission_deadline", nullable = false) private Instant submissionDeadline;
    @Column(name = "judging_deadline", nullable = false) private Instant judgingDeadline;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();

    protected EventEntity() {}
    public EventEntity(String id, String name, String state, Instant startsAt, Instant submissionDeadline, Instant judgingDeadline) {
        this.id = id; this.name = name; this.state = state; this.startsAt = startsAt; this.submissionDeadline = submissionDeadline; this.judgingDeadline = judgingDeadline;
    }
    public String getId() { return id; }
    public String getName() { return name; }
    public String getState() { return state; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getSubmissionDeadline() { return submissionDeadline; }
    public Instant getJudgingDeadline() { return judgingDeadline; }
    public Instant getCreatedAt() { return createdAt; }
}
