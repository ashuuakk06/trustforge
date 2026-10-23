package com.trustforge.api.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "assignments", uniqueConstraints = @UniqueConstraint(columnNames = {"judge_id", "project_id"}))
public class AssignmentEntity {
    @Id private String id;
    @Column(name = "judge_id", nullable = false) private String judgeId;
    @Column(name = "project_id", nullable = false) private String projectId;
    @Column(nullable = false) private String status = "ASSIGNED";
    @Column(name = "fairness_score", nullable = false, precision = 6, scale = 3) private BigDecimal fairnessScore;
    @Column(nullable = false) private String explanation;
    @Column(name = "algorithm_version", nullable = false) private String algorithmVersion;
    @Column(nullable = false) private String seed;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    protected AssignmentEntity() {}
    public AssignmentEntity(String id, String judgeId, String projectId, BigDecimal fairnessScore, String explanation, String algorithmVersion, String seed) {
        this.id = id; this.judgeId = judgeId; this.projectId = projectId; this.fairnessScore = fairnessScore; this.explanation = explanation; this.algorithmVersion = algorithmVersion; this.seed = seed;
    }
    public String getId() { return id; }
    public String getJudgeId() { return judgeId; }
    public String getProjectId() { return projectId; }
    public String getStatus() { return status; }
    public BigDecimal getFairnessScore() { return fairnessScore; }
    public String getExplanation() { return explanation; }
    public String getAlgorithmVersion() { return algorithmVersion; }
    public String getSeed() { return seed; }
    public Instant getCreatedAt() { return createdAt; }
}
