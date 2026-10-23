package com.trustforge.api.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "evaluations", uniqueConstraints = @UniqueConstraint(columnNames = {"judge_id", "project_id", "submission_version"}))
public class EvaluationEntity {
    @Id private String id;
    @Column(name = "judge_id", nullable = false) private String judgeId;
    @Column(name = "project_id", nullable = false) private String projectId;
    @Column(name = "submission_version", nullable = false) private int submissionVersion = 1;
    @Column(name = "rubric_version", nullable = false) private String rubricVersion = "RUBRIC:v3";
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb", nullable = false) private Map<String, Double> scores = new HashMap<>();
    @Column(name = "raw_score", nullable = false, precision = 8, scale = 3) private BigDecimal rawScore;
    @Column(name = "weighted_score", nullable = false, precision = 8, scale = 3) private BigDecimal weightedScore;
    @Column(nullable = false) private String comment = "";
    @Column(nullable = false) private String status = "SUBMITTED";
    @Column(name = "duration_seconds", nullable = false) private int durationSeconds = 510;
    @Column(name = "submitted_at", nullable = false) private Instant submittedAt = Instant.now();
    protected EvaluationEntity() {}
    public EvaluationEntity(String id, String judgeId, String projectId, Map<String, Double> scores, BigDecimal rawScore, BigDecimal weightedScore, String comment) {
        this.id = id; this.judgeId = judgeId; this.projectId = projectId; this.scores = new HashMap<>(scores); this.rawScore = rawScore; this.weightedScore = weightedScore; this.comment = comment == null ? "" : comment;
    }
    public String getId() { return id; }
    public String getJudgeId() { return judgeId; }
    public String getProjectId() { return projectId; }
    public int getSubmissionVersion() { return submissionVersion; }
    public String getRubricVersion() { return rubricVersion; }
    public Map<String, Double> getScores() { return scores; }
    public BigDecimal getRawScore() { return rawScore; }
    public BigDecimal getWeightedScore() { return weightedScore; }
    public String getComment() { return comment; }
    public String getStatus() { return status; }
    public int getDurationSeconds() { return durationSeconds; }
    public Instant getSubmittedAt() { return submittedAt; }
    public void replaceScores(Map<String, Double> scores, BigDecimal rawScore, BigDecimal weightedScore, String comment) {
        this.scores = new HashMap<>(scores); this.rawScore = rawScore; this.weightedScore = weightedScore; this.comment = comment == null ? "" : comment; this.submittedAt = Instant.now();
    }
}
