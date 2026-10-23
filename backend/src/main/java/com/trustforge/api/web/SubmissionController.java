package com.trustforge.api.web;

import com.trustforge.api.persistence.UserEntity;
import com.trustforge.api.security.AuthService;
import com.trustforge.api.submissions.ProjectMapper;
import com.trustforge.api.submissions.SubmissionEventDocument;
import com.trustforge.api.submissions.SubmissionService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1")
public class SubmissionController {
    private final SubmissionService submissions;
    private final AuthService auth;
    public SubmissionController(SubmissionService submissions, AuthService auth) { this.submissions = submissions; this.auth = auth; }

    @GetMapping("/submissions") public Map<String, Object> submissions(@RequestParam(required = false) String q) {
        List<Map<String, Object>> items = submissions.projects(q);
        return Map.of("items", items, "total", items.size(), "page", 0, "pageSize", 50);
    }
    @PostMapping("/submissions") @PreAuthorize("hasAnyRole('PARTICIPANT','ORGANIZER','ADMIN')")
    public ResponseEntity<Map<String, Object>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ApiDtos.SubmissionRequest body) {
        return ResponseEntity.accepted().body(submissions.create(auth.current(jwt.getSubject()), body));
    }
    @GetMapping("/submissions/{id}") public Map<String, Object> detail(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        return submissions.detail(id, auth.current(jwt.getSubject()));
    }
    @GetMapping(value = "/submissions/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        submissions.detail(id, auth.current(jwt.getSubject()));
        SseEmitter emitter = new SseEmitter(0L);
        Set<Long> sent = ConcurrentHashMap.newKeySet();
        AutoCloseable subscription = submissions.subscribe(id, event -> send(emitter, sent, event));
        emitter.onCompletion(() -> close(subscription)); emitter.onTimeout(() -> close(subscription)); emitter.onError(error -> close(subscription));
        submissions.submissionEvents(id).forEach(event -> send(emitter, sent, event));
        return emitter;
    }
    @GetMapping("/gallery") public Map<String, Object> gallery(@RequestParam(required = false) String q) {
        return Map.of("items", submissions.projects(q), "votingOpen", true, "resultsVisible", false, "ordering", "seeded-random");
    }
    private static void send(SseEmitter emitter, Set<Long> sent, SubmissionEventDocument event) {
        if (!sent.add(event.getSequence())) return;
        try {
            emitter.send(SseEmitter.event().name("submission").data(SubmissionService.eventMap(event)));
            if (event.getProgress() == 100 && ("READY_FOR_JUDGING".equals(event.getStage()) || "PROCESSING_FAILED".equals(event.getStage()))) emitter.complete();
        }
        catch (IOException exception) { emitter.completeWithError(exception); }
    }
    private static void close(AutoCloseable closeable) { try { closeable.close(); } catch (Exception ignored) { } }
}
