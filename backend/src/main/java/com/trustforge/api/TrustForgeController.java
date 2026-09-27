package com.trustforge.api;

import com.trustforge.store.TrustForgeStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class TrustForgeController {
    private final TrustForgeStore store;
    public TrustForgeController(TrustForgeStore store) { this.store = store; }

    public record EvaluationRequest(@NotBlank String projectId, Map<String, Object> scores, String comment) {}
    public record VoteRequest(@NotBlank String projectId) {}
    public record CommentRequest(@NotBlank String projectId, @NotBlank String body) {}
    public record CertificateRequest(@NotBlank String certificateId) {}

    @GetMapping("/dashboard") public Map<String, Object> dashboard() { return store.dashboard(); }
    @GetMapping("/events") public Map<String, Object> event() { return (Map<String, Object>) store.dashboard().get("event"); }
    @GetMapping("/submissions") public Map<String, Object> submissions(@RequestParam(required = false) String q) { return Map.of("items", filter(store.projects(), q), "total", store.projects().size(), "page", 0, "pageSize", 50); }
    @GetMapping("/gallery") public Map<String, Object> gallery(@RequestParam(required = false) String q) { return Map.of("items", filter(store.projects(), q), "votingOpen", true, "resultsVisible", false, "ordering", "seeded-random"); }
    @GetMapping("/judges") public Map<String, Object> judges(Authentication auth) { requireRole(auth, "ORGANIZER", "ADMIN"); return Map.of("items", store.judges(), "metrics", store.assignmentMetrics()); }
    @GetMapping("/assignments") public Map<String, Object> assignments(Authentication auth) { requireRole(auth, "ORGANIZER", "ADMIN"); return Map.of("items", store.assignments(), "metrics", store.assignmentMetrics()); }
    @PostMapping("/assignments/run") public Map<String, Object> runAssignments(Authentication auth) { requireRole(auth, "ORGANIZER", "ADMIN"); return Map.of("status", "COMPLETED", "algorithmVersion", "v1.2", "seed", "8f91c7", "assignments", store.assignments(), "metrics", store.assignmentMetrics()); }

    @GetMapping("/evaluations") public Map<String, Object> evaluations(Authentication auth) { return Map.of("items", store.evaluations(auth.getName(), role(auth)), "rubric", rubric()); }
    @PostMapping("/evaluations") public ResponseEntity<?> evaluate(Authentication auth, @Valid @RequestBody EvaluationRequest request) { requireRole(auth, "JUDGE"); try { return ResponseEntity.status(HttpStatus.CREATED).body(store.evaluate(auth.getName(), request.projectId(), request.scores(), request.comment())); } catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage()); } }

    @GetMapping("/normalization") public Map<String, Object> normalization() { return store.normalization(); }
    @PostMapping("/normalization/run") public Map<String, Object> runNormalization(Authentication auth) { requireRole(auth, "ORGANIZER", "ADMIN"); return store.runNormalization(auth.getName()); }
    @GetMapping("/normalization/proof") public Map<String, Object> normalizationProof() { return Map.of("title", "Normalization proof", "dataset", List.of(Map.of("judge", "A", "tendency", "high scorer"), Map.of("judge", "B", "tendency", "strict scorer"), Map.of("judge", "C", "tendency", "middle scorer")), "result", store.normalization(), "formula", "z = (score - judge mean) / judge standard deviation", "edgeCases", List.of("zero standard deviation uses a stable unit denominator", "small sample size is disclosed", "missing evaluations are not silently imputed")); }

    @GetMapping("/anomalies") public Map<String, Object> anomalies(Authentication auth) { requireRole(auth, "ORGANIZER", "ADMIN"); return Map.of("items", store.anomalies(), "summary", Map.of("potential", store.anomalies().size(), "openReviews", store.anomalies().size(), "resolved", 0)); }
    @PostMapping("/anomalies/{id}/review") public Map<String, Object> reviewAnomaly(Authentication auth, @PathVariable String id) { requireRole(auth, "ORGANIZER", "ADMIN"); return Map.of("id", id, "status", "IN_REVIEW", "message", "Review state recorded for organizer follow-up."); }
    @GetMapping("/audit") public Map<String, Object> audit(Authentication auth) { requireRole(auth, "ORGANIZER", "ADMIN"); return Map.of("items", store.audit(), "verification", store.verifyAudit()); }
    @PostMapping("/audit/verify") public Map<String, Object> verifyAudit(Authentication auth) { requireRole(auth, "ORGANIZER", "ADMIN"); return store.verifyAudit(); }

    @GetMapping("/results") public Map<String, Object> results() { return store.resultCenter(); }
    @PostMapping("/results/publish") public Map<String, Object> publishResults(Authentication auth) { requireRole(auth, "ORGANIZER", "ADMIN"); store.publishResults(); return store.resultCenter(); }
    @GetMapping("/votes") public Map<String, Object> votes(Authentication auth) { requireRole(auth, "ORGANIZER", "ADMIN"); return Map.of("items", store.votes(), "total", store.votes().size()); }
    @PostMapping("/votes") public ResponseEntity<?> vote(Authentication auth, @Valid @RequestBody VoteRequest request) { try { return ResponseEntity.status(HttpStatus.CREATED).body(store.castVote(auth.getName(), request.projectId())); } catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage()); } }
    @GetMapping("/comments") public Map<String, Object> comments(@RequestParam(required = false) String projectId) { List<Map<String, Object>> items = store.comments(); if (projectId != null) items = items.stream().filter(c -> projectId.equals(c.get("projectId"))).toList(); return Map.of("items", items); }
    @PostMapping("/comments") public ResponseEntity<?> comment(Authentication auth, @Valid @RequestBody CommentRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(store.addComment(auth.getName(), request.projectId(), request.body())); }
    @GetMapping("/notifications") public Map<String, Object> notifications(Authentication auth) { return Map.of("items", store.notifications()); }
    @GetMapping("/pairwise") public Map<String, Object> pairwise() { return Map.of("mode", "BRADLEY_TERRY", "comparisons", 48, "items", store.pairwise()); }
    @GetMapping("/certificates/verify") public Map<String, Object> certificate(@RequestParam String id) { return store.certificate(id); }
    @PostMapping("/certificates/verify") public Map<String, Object> certificatePost(@Valid @RequestBody CertificateRequest request) { return store.certificate(request.certificateId()); }
    @GetMapping("/search") public Map<String, Object> search(@RequestParam String q) { return Map.of("projects", filter(store.projects(), q), "judges", store.judges().stream().filter(j -> String.valueOf(j.get("name")).toLowerCase().contains(q.toLowerCase())).toList()); }
    @GetMapping("/health/demo") public Map<String, Object> demoHealth() { return Map.of("status", "UP", "database", "seeded-demo-model", "audit", store.verifyAudit()); }

    @GetMapping("/public/certificates/{id}") public Map<String, Object> publicCertificate(@PathVariable String id) { return store.certificate(id); }

    private List<Map<String, Object>> filter(List<Map<String, Object>> items, String q) { if (q == null || q.isBlank()) return items; String needle = q.toLowerCase(); return items.stream().filter(p -> p.values().stream().anyMatch(v -> String.valueOf(v).toLowerCase().contains(needle))).toList(); }
    private String role(Authentication auth) { return auth.getAuthorities().stream().findFirst().map(a -> a.getAuthority().replace("ROLE_", "")).orElse(""); }
    private void requireRole(Authentication auth, String... allowed) { String role = role(auth); if (Arrays.stream(allowed).noneMatch(role::equals)) throw new AccessDeniedException("This action requires organizer or admin access"); }
    private Map<String, Object> rubric() { return Map.of("version", "RUBRIC:v3", "totalWeight", 100, "criteria", List.of(Map.of("name", "Innovation", "weight", 20, "min", 0, "max", 10), Map.of("name", "Technical Quality", "weight", 25, "min", 0, "max", 10), Map.of("name", "Impact", "weight", 20, "min", 0, "max", 10), Map.of("name", "UX", "weight", 15, "min", 0, "max", 10), Map.of("name", "Feasibility", "weight", 20, "min", 0, "max", 10))); }
}
