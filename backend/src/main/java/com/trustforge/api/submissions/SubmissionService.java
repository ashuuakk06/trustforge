package com.trustforge.api.submissions;

import com.trustforge.api.persistence.AuditEventService;
import com.trustforge.api.persistence.EventEntity;
import com.trustforge.api.persistence.EventRepository;
import com.trustforge.api.persistence.ProjectEntity;
import com.trustforge.api.persistence.ProjectRepository;
import com.trustforge.api.persistence.UserEntity;
import com.trustforge.api.web.ApiDtos;
import com.trustforge.api.web.ApiException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubmissionService {
    private final ProjectRepository projects;
    private final EventRepository events;
    private final SubmissionEventService eventService;
    private final SubmissionProcessor processor;
    private final AuditEventService audit;

    public SubmissionService(ProjectRepository projects, EventRepository events, SubmissionEventService eventService, SubmissionProcessor processor, AuditEventService audit) {
        this.projects = projects; this.events = events; this.eventService = eventService; this.processor = processor; this.audit = audit;
    }

    public List<Map<String, Object>> projects(String query) {
        String needle = query == null ? "" : query.trim().toLowerCase();
        return projects.findAllByOrderByCreatedAtAsc().stream().filter(project -> needle.isBlank() || searchable(project).contains(needle)).map(ProjectMapper::galleryProject).toList();
    }

    @Transactional
    public Map<String, Object> create(UserEntity user, ApiDtos.SubmissionRequest input) {
        if (!List.of("PARTICIPANT", "ORGANIZER", "ADMIN").contains(user.getRole())) throw ApiException.forbidden("Only participants, organizers, or administrators can submit a project");
        EventEntity event = events.findAllByOrderByCreatedAtAsc().stream().findFirst().orElseThrow(() -> ApiException.conflict("No hackathon is available for submissions"));
        String id = "P-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String slug = input.name().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "") + "-" + id.toLowerCase();
        ProjectEntity project = projects.saveAndFlush(new ProjectEntity(id, event.getId(), user.getId(), input.name().trim(), slug, input.track().trim(), input.description().trim(),
            input.problemStatement().trim(), input.solution().trim(), input.technology().trim(), input.team().trim(), safeUrl(input.repository()), safeUrl(input.demo()), input.supportingLinks()));
        eventService.record(id, "RECEIVED", "COMPLETED", 5, "Submission received and queued for live validation.", Map.of("ownerId", user.getId()));
        audit.append(user.getEmail(), "SUBMISSION_RECEIVED", "PROJECT:" + id, Map.of("projectId", id, "eventId", event.getId()));
        String actor = user.getEmail();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { processor.process(id, actor); }
        });
        Map<String, Object> response = new LinkedHashMap<>(); response.put("submission", ProjectMapper.project(project)); response.put("submissionId", id);
        response.put("status", "PROCESSING"); response.put("streamUrl", "/api/v1/submissions/" + id + "/events");
        return response;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detail(String id, UserEntity user) {
        ProjectEntity project = projects.findById(id).orElseThrow(() -> ApiException.notFound("Submission not found"));
        if ("PARTICIPANT".equals(user.getRole()) && !user.getId().equals(project.getOwnerId())) throw ApiException.forbidden("You can only view your own submissions");
        Map<String, Object> body = new LinkedHashMap<>(); body.put("submission", ProjectMapper.project(project)); body.put("events", eventService.events(id).stream().map(SubmissionService::eventMap).toList());
        return body;
    }

    public AutoCloseable subscribe(String projectId, Consumer<SubmissionEventDocument> listener) {
        return eventService.subscribe(projectId, listener);
    }
    public List<SubmissionEventDocument> submissionEvents(String projectId) {
        if (!projects.existsById(projectId)) throw ApiException.notFound("Submission not found");
        return eventService.events(projectId);
    }
    public static Map<String, Object> eventMap(SubmissionEventDocument event) {
        Map<String, Object> row = new LinkedHashMap<>(); row.put("sequence", event.getSequence()); row.put("projectId", event.getProjectId()); row.put("stage", event.getStage());
        row.put("status", event.getStatus()); row.put("progress", event.getProgress()); row.put("message", event.getMessage()); row.put("details", event.getDetails()); row.put("createdAt", event.getCreatedAt());
        return row;
    }
    private static String searchable(ProjectEntity project) {
        return String.join(" ", project.getId(), project.getName(), project.getTrack(), project.getDescription(), project.getTechnology(), project.getTeam(), project.getStatus()).toLowerCase();
    }
    private static String safeUrl(String value) {
        if (value == null || !(value.startsWith("https://") || value.startsWith("http://"))) throw ApiException.unprocessable("Repository and demo must be valid http or https URLs");
        return value;
    }
}
