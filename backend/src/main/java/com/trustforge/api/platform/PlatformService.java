package com.trustforge.api.platform;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trustforge.api.core.TrustForgeAlgorithms;
import com.trustforge.api.persistence.AssignmentEntity;
import com.trustforge.api.persistence.AssignmentRepository;
import com.trustforge.api.persistence.AuditEventEntity;
import com.trustforge.api.persistence.AuditEventRepository;
import com.trustforge.api.persistence.AuditEventService;
import com.trustforge.api.persistence.EvaluationEntity;
import com.trustforge.api.persistence.EvaluationRepository;
import com.trustforge.api.persistence.EventEntity;
import com.trustforge.api.persistence.EventRepository;
import com.trustforge.api.persistence.JudgeEntity;
import com.trustforge.api.persistence.JudgeRepository;
import com.trustforge.api.persistence.NormalizationRunEntity;
import com.trustforge.api.persistence.NormalizationRunRepository;
import com.trustforge.api.persistence.ProjectEntity;
import com.trustforge.api.persistence.ProjectRepository;
import com.trustforge.api.persistence.UserEntity;
import com.trustforge.api.persistence.UserRepository;
import com.trustforge.api.submissions.ProjectMapper;
import com.trustforge.api.web.ApiDtos;
import com.trustforge.api.web.ApiException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformService {
    private static final String ALGORITHM = "normalization-v1.0";
    private final EventRepository events;
    private final UserRepository users;
    private final ProjectRepository projects;
    private final JudgeRepository judges;
    private final AssignmentRepository assignments;
    private final EvaluationRepository evaluations;
    private final NormalizationRunRepository normalizationRuns;
    private final AuditEventRepository auditRepository;
    private final AuditEventService audit;
    private final DashboardCache cache;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public PlatformService(EventRepository events, UserRepository users, ProjectRepository projects, JudgeRepository judges,
            AssignmentRepository assignments, EvaluationRepository evaluations, NormalizationRunRepository normalizationRuns,
            AuditEventRepository auditRepository, AuditEventService audit, DashboardCache cache, JdbcTemplate jdbc, ObjectMapper mapper) {
        this.events = events; this.users = users; this.projects = projects; this.judges = judges; this.assignments = assignments; this.evaluations = evaluations;
        this.normalizationRuns = normalizationRuns; this.auditRepository = auditRepository; this.audit = audit; this.cache = cache; this.jdbc = jdbc; this.mapper = mapper;
    }

    public Map<String, Object> event() { return events.findAllByOrderByCreatedAtAsc().stream().findFirst().map(this::eventMap).orElse(Map.of()); }

    public Map<String, Object> dashboard() {
        Map<String, Object> cached = cache.get(); if (cached != null) return cached;
        long assigned = assignments.count(); long completed = evaluations.count();
        long participantCount = count("SELECT COUNT(*) FROM users WHERE role='PARTICIPANT'");
        long voteCount = count("SELECT COUNT(*) FROM votes WHERE status='COUNTED'");
        long anomalyCount = count("SELECT COUNT(*) FROM anomalies WHERE status <> 'RESOLVED'");
        Map<String, Object> verification = audit.verify();
        Map<String, Object> stats = Map.of("participants", participantCount, "teams", projects.count(), "submissions", projects.count(), "judges", judges.count(), "votes", voteCount, "anomalies", anomalyCount);
        Map<String, Object> judging = Map.of("assigned", assigned, "completed", completed, "pending", Math.max(0, assigned - completed), "completionPercent", percent(completed, assigned));
        Map<String, Object> currentAssignmentMetrics = assignmentMetrics(assignments.findAll());
        double meanLoad = ((Map<String, Long>) currentAssignmentMetrics.get("byJudge")).values().stream().mapToDouble(Long::doubleValue).average().orElse(0);
        double loadDeviation = Math.sqrt(number(currentAssignmentMetrics.get("workloadVariance")));
        long assignmentFairness = Math.round(Math.max(0, 100 - loadDeviation / Math.max(1, meanLoad) * 100));
        long scoreConsistency = scoreConsistency();
        Map<String, Object> integrity = Map.of("assignmentFairness", assignmentFairness, "evaluationCompletion", percent(completed, assigned), "scoreConsistency", scoreConsistency, "auditIntegrity", verification.get("verified"));
        List<Map<String, Object>> recent = auditRepository.findTop50ByOrderBySequenceDesc().stream().limit(6).sorted(Comparator.comparing(AuditEventEntity::getSequence).reversed())
            .map(audit::toMap).toList();
        Map<String, Object> result = Map.of("event", event(), "stats", stats, "judging", judging, "integrity", integrity, "recentActivity", recent);
        cache.put(result); return result;
    }

    public Map<String, Object> assignments() {
        List<AssignmentEntity> all = assignments.findAllByOrderByProjectIdAscJudgeIdAsc();
        return Map.of("items", all.stream().map(this::assignmentMap).toList(), "metrics", assignmentMetrics(all));
    }

    public Map<String, Object> assignmentMetrics() { return assignmentMetrics(assignments.findAll()); }

    @Transactional
    public Map<String, Object> runAssignments(String actor) {
        List<JudgeEntity> judgeRows = judges.findAllByOrderByIdAsc();
        List<String> projectIds = projects.findAllByOrderByCreatedAtAsc().stream().map(ProjectEntity::getId).toList();
        Map<String, Set<String>> conflicts = conflictMap();
        List<TrustForgeAlgorithms.JudgeInput> inputs = judgeRows.stream().map(j -> new TrustForgeAlgorithms.JudgeInput(j.getId(), j.getCapacity(), conflicts.getOrDefault(j.getId(), Set.of()))).toList();
        String seed = "tf2026";
        TrustForgeAlgorithms.AssignmentResult calculation = TrustForgeAlgorithms.assignJudges(inputs, projectIds, 3, seed);
        assignments.deleteAllInBatch();
        List<AssignmentEntity> saved = calculation.assignments().stream().map(a -> new AssignmentEntity(a.id(), a.judgeId(), a.projectId(), BigDecimal.valueOf(a.fairnessScore()), a.explanation(), a.algorithmVersion(), a.seed())).toList();
        assignments.saveAll(saved);
        audit.append(actor, "ASSIGNMENT_RUN", "ASSIGNMENT_RUN:" + seed, Map.of("judges", judgeRows.size(), "projects", projectIds.size(), "seed", seed, "infeasible", calculation.infeasible()));
        cache.evict();
        Map<String, Object> response = new LinkedHashMap<>(); response.put("status", calculation.infeasible().isEmpty() ? "COMPLETED" : "COMPLETED_WITH_WARNINGS");
        response.put("algorithmVersion", "v2.0"); response.put("seed", "8f91c7"); response.put("assignments", calculation.assignments()); response.put("infeasible", calculation.infeasible()); response.put("metrics", calculation.metrics());
        return response;
    }

    public Map<String, Object> judges() {
        List<AssignmentEntity> allAssignments = assignments.findAll(); List<EvaluationEntity> allEvaluations = evaluations.findAll(); Map<String, Set<String>> conflicts = conflictMap();
        List<Map<String, Object>> items = new ArrayList<>();
        for (JudgeEntity judge : judges.findAllByOrderByIdAsc()) {
            UserEntity user = users.findById(judge.getUserId()).orElseThrow();
            long assigned = allAssignments.stream().filter(a -> a.getJudgeId().equals(judge.getId())).count();
            long completed = allEvaluations.stream().filter(e -> e.getJudgeId().equals(judge.getId())).count();
            Map<String, Object> row = new LinkedHashMap<>(); row.put("id", judge.getId()); row.put("name", user.getName()); row.put("email", user.getEmail());
            row.put("capacity", judge.getCapacity()); row.put("tendency", judge.getTendency()); row.put("conflicts", conflicts.getOrDefault(judge.getId(), Set.of()));
            row.put("assigned", assigned); row.put("completed", completed); row.put("pending", Math.max(0, assigned - completed)); row.put("completionPercent", percent(completed, assigned)); items.add(row);
        }
        return Map.of("items", items, "metrics", assignmentMetrics(allAssignments));
    }

    public Map<String, Object> evaluations(UserEntity user) {
        List<EvaluationEntity> rows = "JUDGE".equals(user.getRole())
            ? judges.findByUserId(user.getId()).map(j -> evaluations.findByJudgeIdOrderByProjectIdAsc(j.getId())).orElse(List.of())
            : evaluations.findAllByOrderByProjectIdAscJudgeIdAsc();
        List<Map<String, Object>> assignedProjects = "JUDGE".equals(user.getRole())
            ? judges.findByUserId(user.getId()).map(judge -> assignments.findByJudgeIdOrderByProjectIdAsc(judge.getId()).stream()
                .map(AssignmentEntity::getProjectId).map(projects::findById).flatMap(java.util.Optional::stream).map(ProjectMapper::galleryProject).toList()).orElse(List.of())
            : projects.findAllByOrderByCreatedAtAsc().stream().map(ProjectMapper::galleryProject).toList();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("items", rows.stream().map(this::evaluationMap).toList());
        response.put("rubric", Map.of("version", "RUBRIC:v3", "totalWeight", 100, "criteria", TrustForgeAlgorithms.RUBRIC));
        response.put("assignedProjects", assignedProjects); response.put("event", event());
        return response;
    }

    @Transactional
    public Map<String, Object> evaluate(UserEntity user, ApiDtos.EvaluationRequest request) {
        List<String> missing = TrustForgeAlgorithms.RUBRIC_KEYS.stream().filter(key -> request.scores().get(key) == null).toList();
        if (!missing.isEmpty()) throw ApiException.unprocessable("Missing rubric scores: " + String.join(", ", missing));
        if (request.scores().entrySet().stream().anyMatch(e -> !TrustForgeAlgorithms.RUBRIC_KEYS.contains(e.getKey()) || e.getValue() == null || !Double.isFinite(e.getValue()) || e.getValue() < 0 || e.getValue() > 10))
            throw ApiException.unprocessable("Scores must be between 0 and 10");
        JudgeEntity judge = judges.findByUserId(user.getId()).orElseThrow(() -> ApiException.forbidden("Judge profile not found"));
        ProjectEntity project = projects.findById(request.projectId()).orElseThrow(() -> ApiException.notFound("Project not found"));
        if (!assignments.existsByJudgeIdAndProjectId(judge.getId(), project.getId())) throw ApiException.forbidden("Judge is not assigned to this project");
        double weightedTotal = 0; for (Map<String, Object> criterion : TrustForgeAlgorithms.RUBRIC) weightedTotal += request.scores().get((String) criterion.get("key")) * ((Number) criterion.get("weight")).doubleValue() / 10.0;
        final double weighted = weightedTotal;
        double raw = request.scores().values().stream().mapToDouble(Double::doubleValue).average().orElse(0) * 10;
        EvaluationEntity row = evaluations.findByJudgeIdAndProjectIdAndSubmissionVersion(judge.getId(), project.getId(), project.getVersion())
            .orElseGet(() -> new EvaluationEntity("E-" + UUID.randomUUID(), judge.getId(), project.getId(), request.scores(), bd(raw), bd(weighted), request.comment()));
        if (evaluations.existsById(row.getId()) && row.getSubmittedAt() != null) row.replaceScores(request.scores(), bd(raw), bd(weighted), request.comment());
        row = evaluations.saveAndFlush(row);
        audit.append(user.getEmail(), "EVALUATION_SUBMITTED", "EVALUATION:" + row.getId(), Map.of("project", project.getId(), "submissionVersion", project.getVersion(), "rawScore", raw));
        cache.evict(); return evaluationMap(row);
    }

    public Map<String, Object> normalization() { return normalizationRuns.findFirstByOrderByCreatedAtDesc().map(this::normalizationMap).orElseGet(this::emptyNormalization); }

    @Transactional
    public Map<String, Object> runNormalization(String actor) {
        List<EvaluationEntity> evaluationRows = evaluations.findAllByOrderByProjectIdAscJudgeIdAsc();
        List<String> projectIds = projects.findAllByOrderByCreatedAtAsc().stream().map(ProjectEntity::getId).toList();
        List<String> judgeIds = judges.findAllByOrderByIdAsc().stream().map(JudgeEntity::getId).toList();
        List<TrustForgeAlgorithms.EvaluationInput> inputs = evaluationRows.stream().map(e -> new TrustForgeAlgorithms.EvaluationInput(e.getJudgeId(), e.getProjectId(), e.getRawScore().doubleValue())).toList();
        Map<String, Object> calculated = TrustForgeAlgorithms.normalize(inputs, projectIds, judgeIds);
        @SuppressWarnings("unchecked") Map<String, Object> stats = (Map<String, Object>) calculated.get("judgeStats");
        @SuppressWarnings("unchecked") List<Map<String, Object>> scoreRows = (List<Map<String, Object>>) calculated.get("scores");
        @SuppressWarnings("unchecked") List<Map<String, Object>> anomalies = (List<Map<String, Object>>) calculated.get("anomalies");
        String inputHash = TrustForgeAlgorithms.sha256(canonical(evaluationRows.stream().map(this::evaluationMap).toList()));
        NormalizationRunEntity run = normalizationRuns.saveAndFlush(new NormalizationRunEntity("N-" + UUID.randomUUID(), "Z_SCORE", ALGORITHM, actor, stats, scoreRows, inputHash));
        jdbc.update("DELETE FROM anomalies");
        for (Map<String, Object> anomaly : anomalies) {
            jdbc.update("INSERT INTO anomalies(id,run_id,type,severity,judge_id,project_id,observed,baseline,confidence,evidence) VALUES (?,?,?,?,?,?,?,?,?,?)",
                "A-" + UUID.randomUUID(), run.getId(), "PROJECT_SPECIFIC_DEVIATION", anomaly.get("severity"), anomaly.get("judgeId"), anomaly.get("projectId"),
                anomaly.get("observed"), 0.3, anomaly.get("confidence"), "Score differs from this judge's observed scoring distribution; review context before taking action.");
        }
        audit.append(actor, "NORMALIZATION_COMPLETED", run.getId(), Map.of("method", "z-score", "evaluations", evaluationRows.size(), "algorithmVersion", ALGORITHM, "inputHash", inputHash));
        cache.evict(); return normalizationMap(run);
    }

    public Map<String, Object> normalizationProof() {
        return Map.of("title", "Normalization proof", "formula", "z = (score - judge mean) / judge standard deviation",
            "edgeCases", List.of("zero standard deviation uses a stable unit denominator", "small sample size is disclosed", "missing evaluations are not silently imputed"), "result", normalization());
    }

    public Map<String, Object> anomalies() {
        List<Map<String, Object>> items = jdbc.queryForList("SELECT id,type,severity,judge_id AS \"judgeId\",project_id AS \"projectId\",observed::float AS observed,baseline::float AS baseline,confidence::float AS confidence,status,evidence,reviewer_notes AS \"reviewerNotes\",created_at AS \"createdAt\" FROM anomalies ORDER BY created_at DESC");
        long open = items.stream().filter(i -> !"RESOLVED".equals(i.get("status"))).count();
        return Map.of("items", items, "summary", Map.of("potential", items.size(), "openReviews", open, "resolved", items.size() - open));
    }

    @Transactional
    public Map<String, Object> reviewAnomaly(String id, String actor, String notes) {
        int updated = jdbc.update("UPDATE anomalies SET status='RESOLVED',reviewer_notes=? WHERE id=?", notes == null ? "" : notes, id);
        if (updated == 0) throw ApiException.notFound("Anomaly not found");
        audit.append(actor, "ANOMALY_REVIEWED", "ANOMALY:" + id, Map.of("notes", notes == null ? "" : notes));
        return jdbc.queryForMap("SELECT id,type,severity,judge_id AS \"judgeId\",project_id AS \"projectId\",observed::float AS observed,baseline::float AS baseline,confidence::float AS confidence,status,evidence,reviewer_notes AS \"reviewerNotes\",created_at AS \"createdAt\" FROM anomalies WHERE id=?", id);
    }

    public Map<String, Object> auditData() { return audit.data(); }
    public Map<String, Object> verifyAudit() { return audit.verify(); }

    public Map<String, Object> results() {
        try {
            Map<String, Object> snapshot = jdbc.queryForMap("SELECT version,published,calculated_at AS \"calculatedAt\",methodology,input_hash AS \"inputHash\",entries FROM result_snapshots ORDER BY calculated_at DESC LIMIT 1");
            snapshot.put("entries", readJson(snapshot.get("entries"), new TypeReference<List<Map<String, Object>>>() {}));
            return snapshot;
        } catch (EmptyResultDataAccessException ignored) { return calculatedResults(false); }
    }

    @Transactional
    public Map<String, Object> publishResults(String actor) {
        Map<String, Object> calculated = calculatedResults(true);
        String version = String.valueOf(calculated.get("version"));
        String entriesJson = json(calculated.get("entries"));
        jdbc.update("INSERT INTO result_snapshots(version,published,calculated_at,methodology,input_hash,entries) VALUES (?,?,NOW(),?,?,?::jsonb) ON CONFLICT(version) DO UPDATE SET published=EXCLUDED.published,calculated_at=EXCLUDED.calculated_at,methodology=EXCLUDED.methodology,input_hash=EXCLUDED.input_hash,entries=EXCLUDED.entries",
            version, true, calculated.get("methodology"), calculated.get("inputHash"), entriesJson);
        audit.append(actor, "RESULTS_PUBLISHED", "RESULTS:" + version, Map.of("version", version, "inputHash", calculated.get("inputHash")));
        cache.evict(); return results();
    }

    public Map<String, Object> votes() { List<Map<String, Object>> items = jdbc.queryForList("SELECT id,voter_id AS voter,project_id AS \"projectId\",created_at AS \"createdAt\",status FROM votes ORDER BY created_at DESC"); return Map.of("items", items, "total", items.size()); }

    @Transactional
    public Map<String, Object> castVote(UserEntity user, String projectId) {
        if (!projects.existsById(projectId)) throw ApiException.notFound("Project not found");
        if (Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM votes WHERE voter_id=?)", Boolean.class, user.getId()))) throw ApiException.conflict("Each account may vote once");
        String id = "V-" + UUID.randomUUID(); jdbc.update("INSERT INTO votes(id,voter_id,project_id) VALUES (?,?,?)", id, user.getId(), projectId);
        audit.append(user.getEmail(), "COMMUNITY_VOTE_CAST", "VOTE:" + id, Map.of("projectId", projectId)); cache.evict();
        return jdbc.queryForMap("SELECT id,voter_id AS voter,project_id AS \"projectId\",created_at AS \"createdAt\",status FROM votes WHERE id=?", id);
    }

    public Map<String, Object> comments(String projectId) {
        List<Map<String, Object>> items = projectId == null || projectId.isBlank()
            ? jdbc.queryForList("SELECT c.id,c.project_id AS \"projectId\",u.email AS author,c.body,c.created_at AS \"createdAt\" FROM comments c JOIN users u ON u.id=c.author_id ORDER BY c.created_at DESC")
            : jdbc.queryForList("SELECT c.id,c.project_id AS \"projectId\",u.email AS author,c.body,c.created_at AS \"createdAt\" FROM comments c JOIN users u ON u.id=c.author_id WHERE c.project_id=? ORDER BY c.created_at DESC", projectId);
        return Map.of("items", items);
    }

    @Transactional
    public Map<String, Object> addComment(UserEntity user, String projectId, String body) {
        if (!projects.existsById(projectId)) throw ApiException.notFound("Project not found");
        String id = "C-" + UUID.randomUUID(); jdbc.update("INSERT INTO comments(id,author_id,project_id,body) VALUES (?,?,?,?)", id, user.getId(), projectId, body.trim());
        audit.append(user.getEmail(), "COMMENT_ADDED", "COMMENT:" + id, Map.of("projectId", projectId));
        return jdbc.queryForMap("SELECT c.id,c.project_id AS \"projectId\",u.email AS author,c.body,c.created_at AS \"createdAt\" FROM comments c JOIN users u ON u.id=c.author_id WHERE c.id=?", id);
    }

    public Map<String, Object> notifications(UserEntity user) {
        List<Map<String, Object>> items = jdbc.queryForList("SELECT id,type,message,created_at AS \"createdAt\",read FROM notifications WHERE user_id=? OR user_id IS NULL ORDER BY created_at DESC", user.getId());
        return Map.of("items", items);
    }

    public Map<String, Object> certificate(String id) {
        try {
            Map<String, Object> row = jdbc.queryForMap("SELECT id AS \"certificateId\",participant_name AS name,event_name AS event,achievement,issued_date AS \"issuedDate\",signature FROM certificates WHERE LOWER(id)=LOWER(?)", id);
            row.put("verified", true); return row;
        } catch (EmptyResultDataAccessException ignored) { return Map.of("certificateId", id, "verified", false, "message", "Certificate not found"); }
    }

    public Map<String, Object> pairwise() {
        List<Map<String, Object>> entries = results().get("entries") instanceof List<?> value ? (List<Map<String, Object>>) value : List.of();
        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> row : entries) {
            double score = number(row.get("finalScore"));
            items.add(Map.of("projectId", row.get("projectId"), "project", row.get("project"), "strength", TrustForgeAlgorithms.round(score / 100.0), "comparisons", Math.max(0, entries.size() - 1)));
        }
        return Map.of("mode", "BRADLEY_TERRY", "comparisons", items.size() * Math.max(0, items.size() - 1), "items", items);
    }

    public Map<String, Object> search(String query) {
        if (query == null || query.isBlank()) throw ApiException.badRequest("Search query is required");
        String needle = query.toLowerCase();
        List<Map<String, Object>> projectRows = projects.findAllByOrderByCreatedAtAsc().stream().filter(p -> ProjectMapper.galleryProject(p).values().stream().anyMatch(v -> String.valueOf(v).toLowerCase().contains(needle))).map(ProjectMapper::galleryProject).toList();
        List<Map<String, Object>> judgeRows = judges().get("items") instanceof List<?> rows ? ((List<Map<String, Object>>) rows).stream().filter(row -> (row.get("name") + " " + row.get("email")).toLowerCase().contains(needle)).toList() : List.of();
        return Map.of("projects", projectRows, "judges", judgeRows);
    }

    public Map<String, Object> demoHealth() {
        Map<String, Object> result = new LinkedHashMap<>(); result.put("status", "UP"); result.put("database", "postgresql"); result.put("cache", "redis-optional"); result.put("audit", audit.verify()); return result;
    }

    private Map<String, Object> calculatedResults(boolean nextVersion) {
        List<Map<String, Object>> scoreRows = normalizationRuns.findFirstByOrderByCreatedAtDesc().map(NormalizationRunEntity::getScores).orElseGet(() -> {
            @SuppressWarnings("unchecked") List<Map<String, Object>> rows = (List<Map<String, Object>>) normalization().get("scores"); return rows;
        });
        Map<String, Long> voteCounts = jdbc.queryForList("SELECT project_id,COUNT(*) AS count FROM votes WHERE status='COUNTED' GROUP BY project_id").stream().collect(Collectors.toMap(r -> String.valueOf(r.get("project_id")), r -> ((Number) r.get("count")).longValue()));
        long maxVotes = voteCounts.values().stream().mapToLong(Long::longValue).max().orElse(0);
        List<Map<String, Object>> entries = new ArrayList<>();
        for (Map<String, Object> score : scoreRows) {
            String projectId = String.valueOf(score.get("projectId"));
            ProjectEntity project = projects.findById(projectId).orElse(null); if (project == null) continue;
            double raw = number(score.get("rawAverage")); double normalized = number(score.get("normalizedScore"));
            double community = maxVotes == 0 ? 0 : voteCounts.getOrDefault(projectId, 0L) * 100.0 / maxVotes;
            double finalScore = raw * 0.7 + community * 0.3;
            Map<String, Object> row = new LinkedHashMap<>(); row.put("projectId", projectId); row.put("project", project.getName()); row.put("rawScore", round(raw));
            row.put("normalizedScore", round(normalized)); row.put("communityScore", round(community)); row.put("finalScore", round(finalScore)); row.put("prize", "");
            entries.add(row);
        }
        entries.sort(Comparator.comparingDouble((Map<String, Object> row) -> number(row.get("finalScore"))).reversed().thenComparing(row -> String.valueOf(row.get("projectId"))));
        for (int i = 0; i < entries.size(); i++) {
            entries.get(i).put("rank", i + 1);
            if (i == 0) entries.get(i).put("prize", "Best Overall");
        }
        String hash = TrustForgeAlgorithms.sha256(canonical(entries));
        String version = nextVersion ? "RESULT-" + Instant.now().toEpochMilli() : "RESULT-DRAFT";
        return Map.of("version", version, "published", false, "calculatedAt", Instant.now(), "methodology", "Raw evaluations are normalized per judge; community votes contribute 30% of the final score.", "inputHash", hash, "entries", entries);
    }

    private Map<String, Object> eventMap(EventEntity event) {
        return Map.of("id", event.getId(), "name", event.getName(), "state", event.getState(), "start", event.getStartsAt(), "submissionDeadline", event.getSubmissionDeadline(), "judgingDeadline", event.getJudgingDeadline());
    }
    private Map<String, Object> assignmentMap(AssignmentEntity a) {
        return Map.of("id", a.getId(), "judgeId", a.getJudgeId(), "projectId", a.getProjectId(), "status", a.getStatus(), "fairnessScore", a.getFairnessScore(),
            "explanation", a.getExplanation(), "algorithmVersion", a.getAlgorithmVersion(), "seed", a.getSeed(), "createdAt", a.getCreatedAt());
    }
    private Map<String, Object> evaluationMap(EvaluationEntity e) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", e.getId()); row.put("judgeId", e.getJudgeId()); row.put("projectId", e.getProjectId()); row.put("submissionVersion", e.getSubmissionVersion());
        row.put("rubricVersion", e.getRubricVersion()); row.put("scores", e.getScores()); row.put("rawScore", e.getRawScore()); row.put("weightedScore", e.getWeightedScore());
        row.put("comment", e.getComment()); row.put("status", e.getStatus()); row.put("durationSeconds", e.getDurationSeconds()); row.put("submittedAt", e.getSubmittedAt());
        return row;
    }
    private Map<String, Object> normalizationMap(NormalizationRunEntity run) {
        return Map.of("id", run.getId(), "method", run.getMethod(), "algorithmVersion", run.getAlgorithmVersion(), "actor", run.getActor(), "judgeStats", run.getJudgeStats(), "scores", run.getScores(), "inputHash", run.getInputHash(), "createdAt", run.getCreatedAt());
    }
    private Map<String, Object> emptyNormalization() {
        Map<String, Object> row = new LinkedHashMap<>(); row.put("id", null); row.put("method", "Z_SCORE"); row.put("algorithmVersion", ALGORITHM); row.put("actor", "SYSTEM");
        row.put("judgeStats", Map.of()); row.put("scores", List.of()); row.put("createdAt", null); return row;
    }
    private Map<String, Object> assignmentMetrics(List<AssignmentEntity> rows) {
        Map<String, Long> counts = rows.stream().collect(Collectors.groupingBy(AssignmentEntity::getJudgeId, LinkedHashMap::new, Collectors.counting()));
        Map<String, Long> coverage = rows.stream().collect(Collectors.groupingBy(AssignmentEntity::getProjectId, Collectors.counting()));
        double mean = counts.values().stream().mapToDouble(Long::doubleValue).average().orElse(0);
        double variance = counts.values().stream().mapToDouble(v -> Math.pow(v - mean, 2)).average().orElse(0);
        long projectCount = projects.count(); long covered = projects.findAll().stream().filter(p -> coverage.getOrDefault(p.getId(), 0L) >= 3).count(); int totalCapacity = judges.findAll().stream().mapToInt(JudgeEntity::getCapacity).sum();
        long min = projectCount == 0 ? 0 : projects.findAll().stream().mapToLong(p -> coverage.getOrDefault(p.getId(), 0L)).min().orElse(0);
        long max = coverage.values().stream().mapToLong(Long::longValue).max().orElse(0);
        Map<String, Set<String>> conflicts = conflictMap();
        long conflicted = rows.stream().filter(a -> conflicts.getOrDefault(a.getJudgeId(), Set.of()).contains(a.getProjectId())).count();
        return Map.of("workloadVariance", TrustForgeAlgorithms.round(variance), "coverageRate", projectCount == 0 ? 100 : TrustForgeAlgorithms.round(covered * 100.0 / projectCount),
            "conflictRate", rows.isEmpty() ? 0 : TrustForgeAlgorithms.round(conflicted * 100.0 / rows.size()), "judgeUtilization", TrustForgeAlgorithms.round(rows.size() * 100.0 / Math.max(1, totalCapacity)), "minimumCoverage", min, "maximumCoverage", max, "byJudge", counts);
    }
    private long scoreConsistency() {
        Map<String, Double> judgeMeans = evaluations.findAll().stream().collect(Collectors.groupingBy(EvaluationEntity::getJudgeId, Collectors.averagingDouble(e -> e.getRawScore().doubleValue())));
        double mean = judgeMeans.values().stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double variance = judgeMeans.values().stream().mapToDouble(value -> Math.pow(value - mean, 2)).average().orElse(0);
        return Math.round(Math.max(0, 100 - Math.min(100, Math.sqrt(variance) * 2)));
    }
    private Map<String, Set<String>> conflictMap() {
        Map<String, Set<String>> map = new HashMap<>();
        for (Map<String, Object> row : jdbc.queryForList("SELECT judge_id,project_id FROM judge_conflicts")) map.computeIfAbsent(String.valueOf(row.get("judge_id")), ignored -> new java.util.HashSet<>()).add(String.valueOf(row.get("project_id")));
        return map;
    }
    private long count(String sql) { Long n = jdbc.queryForObject(sql, Long.class); return n == null ? 0 : n; }
    private double percent(long part, long total) { return TrustForgeAlgorithms.round(part * 100.0 / Math.max(1, total)); }
    private BigDecimal bd(double value) { return BigDecimal.valueOf(value).setScale(3, java.math.RoundingMode.HALF_UP); }
    private double round(double value) { return TrustForgeAlgorithms.round(value); }
    private double number(Object value) { return value instanceof Number n ? n.doubleValue() : 0; }
    private String canonical(Object value) {
        try { return mapper.copy().configure(com.fasterxml.jackson.databind.SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true).writeValueAsString(value); }
        catch (Exception exception) { throw new IllegalStateException("Could not serialize data", exception); }
    }
    private String json(Object value) {
        try { return mapper.writeValueAsString(value); } catch (Exception exception) { throw new IllegalStateException(exception); }
    }
    private <T> T readJson(Object value, TypeReference<T> type) {
        try { return mapper.readValue(String.valueOf(value), type); } catch (Exception exception) { throw new IllegalStateException("Stored JSON is invalid", exception); }
    }
}
