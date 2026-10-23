package com.trustforge.api.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "projects")
public class ProjectEntity {
    @Id private String id;
    @Column(name = "event_id", nullable = false) private String eventId;
    @Column(name = "owner_id") private String ownerId;
    @Column(nullable = false) private String name;
    @Column(nullable = false, unique = true) private String slug;
    @Column(nullable = false) private String track;
    @Column(nullable = false) private String description;
    @Column(name = "problem_statement", nullable = false) private String problemStatement = "";
    @Column(nullable = false) private String solution = "";
    @Column(nullable = false) private String technology;
    @Column(nullable = false) private String team;
    @Column(nullable = false) private String repository;
    @Column(nullable = false) private String demo;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "supporting_links", columnDefinition = "jsonb", nullable = false)
    private List<String> supportingLinks = new ArrayList<>();
    @Column(name = "content_hash") private String contentHash;
    @Column(nullable = false) private String status = "SUBMITTED";
    @Column(name = "processing_status", nullable = false) private String processingStatus = "READY";
    @Column(nullable = false) private int version = 1;
    @Column(name = "submitted_at") private Instant submittedAt;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();

    protected ProjectEntity() {}
    public ProjectEntity(String id, String eventId, String ownerId, String name, String slug, String track, String description,
            String problemStatement, String solution, String technology, String team, String repository, String demo, List<String> supportingLinks) {
        this.id = id; this.eventId = eventId; this.ownerId = ownerId; this.name = name; this.slug = slug; this.track = track;
        this.description = description; this.problemStatement = problemStatement; this.solution = solution; this.technology = technology;
        this.team = team; this.repository = repository; this.demo = demo; this.supportingLinks = supportingLinks == null ? new ArrayList<>() : new ArrayList<>(supportingLinks);
        this.status = "PROCESSING"; this.processingStatus = "PROCESSING"; this.submittedAt = Instant.now();
    }
    public String getId() { return id; }
    public String getEventId() { return eventId; }
    public String getOwnerId() { return ownerId; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public String getTrack() { return track; }
    public String getDescription() { return description; }
    public String getProblemStatement() { return problemStatement; }
    public String getSolution() { return solution; }
    public String getTechnology() { return technology; }
    public String getTeam() { return team; }
    public String getRepository() { return repository; }
    public String getDemo() { return demo; }
    public List<String> getSupportingLinks() { return supportingLinks; }
    public String getContentHash() { return contentHash; }
    public String getStatus() { return status; }
    public String getProcessingStatus() { return processingStatus; }
    public int getVersion() { return version; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setContentHash(String contentHash) { this.contentHash = contentHash; }
    public void setStatus(String status) { this.status = status; }
    public void setProcessingStatus(String processingStatus) { this.processingStatus = processingStatus; }
}
