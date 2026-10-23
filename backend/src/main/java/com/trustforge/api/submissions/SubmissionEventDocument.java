package com.trustforge.api.submissions;

import java.time.Instant;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("submission_events")
public class SubmissionEventDocument {
    @Id private String id;
    private String projectId;
    private long sequence;
    private String stage;
    private String status;
    private int progress;
    private String message;
    private Map<String, Object> details;
    private Instant createdAt;

    public SubmissionEventDocument() {}
    public SubmissionEventDocument(String projectId, long sequence, String stage, String status, int progress, String message, Map<String, Object> details) {
        this.projectId = projectId; this.sequence = sequence; this.stage = stage; this.status = status; this.progress = progress; this.message = message;
        this.details = details == null ? Map.of() : details; this.createdAt = Instant.now();
    }
    public String getId() { return id; }
    public String getProjectId() { return projectId; }
    public long getSequence() { return sequence; }
    public String getStage() { return stage; }
    public String getStatus() { return status; }
    public int getProgress() { return progress; }
    public String getMessage() { return message; }
    public Map<String, Object> getDetails() { return details; }
    public Instant getCreatedAt() { return createdAt; }
}
