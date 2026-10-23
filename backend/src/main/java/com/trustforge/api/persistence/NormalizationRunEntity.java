package com.trustforge.api.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "normalization_runs")
public class NormalizationRunEntity {
    @Id private String id;
    @Column(nullable = false) private String method;
    @Column(name = "algorithm_version", nullable = false) private String algorithmVersion;
    @Column(nullable = false) private String actor;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "judge_stats", columnDefinition = "jsonb", nullable = false) private Map<String, Object> judgeStats;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb", nullable = false) private List<Map<String, Object>> scores;
    @Column(name = "input_hash", nullable = false) private String inputHash;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    protected NormalizationRunEntity() {}
    public NormalizationRunEntity(String id, String method, String algorithmVersion, String actor, Map<String, Object> judgeStats, List<Map<String, Object>> scores, String inputHash) {
        this.id = id; this.method = method; this.algorithmVersion = algorithmVersion; this.actor = actor; this.judgeStats = judgeStats; this.scores = scores; this.inputHash = inputHash;
    }
    public String getId() { return id; }
    public String getMethod() { return method; }
    public String getAlgorithmVersion() { return algorithmVersion; }
    public String getActor() { return actor; }
    public Map<String, Object> getJudgeStats() { return judgeStats; }
    public List<Map<String, Object>> getScores() { return scores; }
    public String getInputHash() { return inputHash; }
    public Instant getCreatedAt() { return createdAt; }
}
