package com.trustforge.api.web;

import com.trustforge.api.security.AuthService;
import com.trustforge.api.submissions.SubmissionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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

@RestController
@RequestMapping("/api/v1")
public class SubmissionController {
  private final SubmissionService submissions;
  private final AuthService auth;

  public SubmissionController(SubmissionService submissions, AuthService auth) {
    this.submissions = submissions;
    this.auth = auth;
  }

  @GetMapping("/submissions")
  public Map<String, Object> submissions(@RequestParam(required = false) String q) {
    List<Map<String, Object>> items = submissions.projects(q);
    return Map.of("items", items, "total", items.size(), "page", 0, "pageSize", 50);
  }

  @PostMapping("/submissions")
  @PreAuthorize("hasAnyRole('PARTICIPANT','ORGANIZER','ADMIN')")
  public ResponseEntity<Map<String, Object>> create(
      @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ApiDtos.SubmissionRequest body) {
    return ResponseEntity.accepted().body(submissions.create(auth.current(jwt.getSubject()), body));
  }

  @GetMapping("/submissions/{id}")
  public Map<String, Object> detail(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
    return submissions.detail(id, auth.current(jwt.getSubject()));
  }

  @GetMapping("/submissions/{id}/events")
  public Map<String, Object> events(
      @PathVariable String id,
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(defaultValue = "0") long afterSequence) {
    return submissions.submissionEvents(id, auth.current(jwt.getSubject()), afterSequence);
  }

  @GetMapping("/gallery")
  public Map<String, Object> gallery(@RequestParam(required = false) String q) {
    return Map.of(
        "items",
        submissions.projects(q),
        "votingOpen",
        true,
        "resultsVisible",
        false,
        "ordering",
        "created-at-ascending");
  }

}
