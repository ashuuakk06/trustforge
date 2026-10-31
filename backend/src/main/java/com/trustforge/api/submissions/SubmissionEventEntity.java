package com.trustforge.api.submissions;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "submission_processing_events")
public class SubmissionEventEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "sequence")
  private Long sequence;

  @Column(name = "project_id", nullable = false)
  private String projectId;

  @Column(nullable = false)
  private String stage;

  @Column(nullable = false)
  private String status;

  @Column(nullable = false)
  private int progress;

  @Column(nullable = false)
  private String message;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb", nullable = false)
  private Map<String, Object> details = new HashMap<>();

  @Column(name = "created_at", nullable = false)
  private Instant createdAt = Instant.now();

  protected SubmissionEventEntity() {}

  public SubmissionEventEntity(
      String projectId,
      String stage,
      String status,
      int progress,
      String message,
      Map<String, Object> details) {
    this.projectId = projectId;
    this.stage = stage;
    this.status = status;
    this.progress = progress;
    this.message = message;
    this.details = details == null ? new HashMap<>() : new HashMap<>(details);
  }

  public Long getSequence() {
    return sequence;
  }

  public String getProjectId() {
    return projectId;
  }

  public String getStage() {
    return stage;
  }

  public String getStatus() {
    return status;
  }

  public int getProgress() {
    return progress;
  }

  public String getMessage() {
    return message;
  }

  public Map<String, Object> getDetails() {
    return details;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
