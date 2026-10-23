package com.trustforge.api.web;

import com.trustforge.api.persistence.UserEntity;
import com.trustforge.api.platform.PlatformService;
import com.trustforge.api.security.AuthService;
import jakarta.validation.Valid;
import java.util.Map;
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

@RestController
@RequestMapping("/api/v1")
public class PlatformController {
    private final PlatformService platform;
    private final AuthService auth;
    public PlatformController(PlatformService platform, AuthService auth) { this.platform = platform; this.auth = auth; }

    @GetMapping("/health") public Map<String, Object> health() { return Map.of("status", "UP", "service", "trustforge-api"); }
    @GetMapping("/health/demo") public Map<String, Object> demoHealth() { return platform.demoHealth(); }
    @GetMapping("/events") public Map<String, Object> event() { return platform.event(); }
    @GetMapping("/dashboard") public Map<String, Object> dashboard() { return platform.dashboard(); }

    @GetMapping("/judges") @PreAuthorize("hasAnyRole('ORGANIZER','ADMIN')") public Map<String, Object> judges() { return platform.judges(); }
    @GetMapping("/assignments") @PreAuthorize("hasAnyRole('ORGANIZER','ADMIN')") public Map<String, Object> assignments() { return platform.assignments(); }
    @PostMapping("/assignments/run") @PreAuthorize("hasAnyRole('ORGANIZER','ADMIN')") public Map<String, Object> runAssignments(@AuthenticationPrincipal Jwt jwt) { return platform.runAssignments(actor(jwt)); }

    @GetMapping("/evaluations") public Map<String, Object> evaluations(@AuthenticationPrincipal Jwt jwt) { return platform.evaluations(current(jwt)); }
    @PostMapping("/evaluations") @PreAuthorize("hasRole('JUDGE')") public Map<String, Object> evaluate(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ApiDtos.EvaluationRequest body) { return platform.evaluate(current(jwt), body); }

    @GetMapping("/normalization") public Map<String, Object> normalization() { return platform.normalization(); }
    @PostMapping("/normalization/run") @PreAuthorize("hasAnyRole('ORGANIZER','ADMIN')") public Map<String, Object> runNormalization(@AuthenticationPrincipal Jwt jwt) { return platform.runNormalization(actor(jwt)); }
    @GetMapping("/normalization/proof") public Map<String, Object> normalizationProof() { return platform.normalizationProof(); }

    @GetMapping("/anomalies") @PreAuthorize("hasAnyRole('ORGANIZER','ADMIN')") public Map<String, Object> anomalies() { return platform.anomalies(); }
    @PostMapping("/anomalies/{id}/review") @PreAuthorize("hasAnyRole('ORGANIZER','ADMIN')") public Map<String, Object> review(@PathVariable String id, @AuthenticationPrincipal Jwt jwt, @RequestBody(required = false) ApiDtos.ReviewRequest body) {
        return platform.reviewAnomaly(id, actor(jwt), body == null ? "" : body.notes());
    }

    @GetMapping("/audit") @PreAuthorize("hasAnyRole('ORGANIZER','ADMIN')") public Map<String, Object> audit() { return platform.auditData(); }
    @PostMapping("/audit/verify") @PreAuthorize("hasAnyRole('ORGANIZER','ADMIN')") public Map<String, Object> verifyAudit() { return platform.verifyAudit(); }

    @GetMapping("/results") public Map<String, Object> results() { return platform.results(); }
    @PostMapping("/results/publish") @PreAuthorize("hasAnyRole('ORGANIZER','ADMIN')") public Map<String, Object> publish(@AuthenticationPrincipal Jwt jwt) { return platform.publishResults(actor(jwt)); }
    @GetMapping("/votes") @PreAuthorize("hasAnyRole('ORGANIZER','ADMIN')") public Map<String, Object> votes() { return platform.votes(); }
    @PostMapping("/votes") @PreAuthorize("hasAnyRole('ADMIN','ORGANIZER','JUDGE','PARTICIPANT')") public Map<String, Object> vote(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ApiDtos.ProjectRequest body) { return platform.castVote(current(jwt), body.projectId()); }

    @GetMapping("/comments") public Map<String, Object> comments(@RequestParam(required = false) String projectId) { return platform.comments(projectId); }
    @PostMapping("/comments") public Map<String, Object> comment(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ApiDtos.CommentRequest body) { return platform.addComment(current(jwt), body.projectId(), body.body()); }
    @GetMapping("/notifications") public Map<String, Object> notifications(@AuthenticationPrincipal Jwt jwt) { return platform.notifications(current(jwt)); }
    @GetMapping("/pairwise") public Map<String, Object> pairwise() { return platform.pairwise(); }

    @GetMapping("/certificates/verify") public Map<String, Object> verifyCertificate(@RequestParam(defaultValue = "") String id) { return platform.certificate(id); }
    @PostMapping("/certificates/verify") public Map<String, Object> verifyCertificate(@Valid @RequestBody ApiDtos.CertificateRequest body) { return platform.certificate(body.certificateId()); }
    @GetMapping("/public/certificates/{id}") public Map<String, Object> publicCertificate(@PathVariable String id) { return platform.certificate(id); }
    @GetMapping("/search") public Map<String, Object> search(@RequestParam String q) { return platform.search(q); }

    private UserEntity current(Jwt jwt) { return auth.current(jwt.getSubject()); }
    private String actor(Jwt jwt) { return String.valueOf(jwt.getClaims().getOrDefault("email", jwt.getSubject())); }
}
