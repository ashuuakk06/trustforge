package com.trustforge.api.submissions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.trustforge.api.core.TrustForgeAlgorithms;
import com.trustforge.api.persistence.AuditEventService;
import com.trustforge.api.persistence.ProjectEntity;
import com.trustforge.api.persistence.ProjectRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubmissionProcessor {
    private final ProjectRepository projects;
    private final SubmissionEventService events;
    private final AuditEventService audit;
    private final ObjectMapper canonicalMapper;
    public SubmissionProcessor(ProjectRepository projects, SubmissionEventService events, AuditEventService audit, ObjectMapper mapper) {
        this.projects = projects; this.events = events; this.audit = audit; this.canonicalMapper = mapper.copy().configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    @Async
    @Transactional
    public void process(String id, String actor) { processTransaction(id, actor); }

    @Transactional
    public void processTransaction(String id, String actor) {
        ProjectEntity project = projects.findById(id).orElse(null);
        if (project == null) return;
        try {
            stage(id, "VALIDATING", "RUNNING", 20, "Validating project fields and URLs.", Map.of());
            if (project.getName().isBlank() || project.getDescription().length() < 20 || project.getProblemStatement().length() < 20 || project.getSolution().length() < 20)
                throw new IllegalArgumentException("Required submission details are incomplete");
            stage(id, "VALIDATING", "COMPLETED", 30, "Validation passed; required project details are present.", Map.of());
            stage(id, "HASHING", "RUNNING", 45, "Creating a deterministic content fingerprint.", Map.of());
            Map<String, Object> content = new LinkedHashMap<>(); content.put("name", project.getName()); content.put("description", project.getDescription());
            content.put("problemStatement", project.getProblemStatement()); content.put("solution", project.getSolution()); content.put("technology", project.getTechnology());
            content.put("team", project.getTeam()); content.put("repository", project.getRepository()); content.put("demo", project.getDemo()); content.put("version", project.getVersion());
            String contentHash = TrustForgeAlgorithms.sha256(canonicalMapper.writeValueAsString(content));
            project.setContentHash(contentHash);
            stage(id, "HASHING", "COMPLETED", 55, "Content fingerprint stored for version verification.", Map.of("contentHash", contentHash));
            stage(id, "PERSISTING", "RUNNING", 70, "Persisting the submission as the immutable judging target.", Map.of());
            project.setStatus("SUBMITTED"); project.setProcessingStatus("PROCESSING"); projects.save(project);
            stage(id, "PERSISTING", "COMPLETED", 78, "Submission is now available to authorized organizers and judges.", Map.of());
            stage(id, "AUDITING", "RUNNING", 88, "Appending the submission event to the audit chain.", Map.of());
            audit.append(actor, "SUBMISSION_PROCESSED", "PROJECT:" + id, Map.of("projectId", id, "contentHash", contentHash));
            project.setProcessingStatus("READY"); projects.save(project);
            stage(id, "AUDITING", "COMPLETED", 95, "Audit event appended and linked to the previous event.", Map.of());
            stage(id, "READY_FOR_JUDGING", "COMPLETED", 100, "Submission is ready for conflict-aware judge assignment.", Map.of());
        } catch (Exception exception) {
            project.setStatus("PROCESSING_FAILED"); project.setProcessingStatus("FAILED"); projects.save(project);
            stage(id, "PROCESSING_FAILED", "FAILED", 100, "Submission processing failed: " + exception.getMessage(), Map.of());
        }
    }
    private void stage(String id, String stage, String status, int progress, String message, Map<String, Object> details) { events.record(id, stage, status, progress, message, details); }
}
