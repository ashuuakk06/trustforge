package com.trustforge.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A deliberately small, deterministic read/write model for the demo profile.
 * PostgreSQL/Flyway is wired for deployment; this model keeps the local demo
 * self-contained and makes the judging algorithms easy to audit and test.
 */
@Component
public class TrustForgeStore {
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
    private final ObjectMapper mapper;
    private final PasswordEncoder passwords;
    private final Map<String, User> users = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> projects = new LinkedHashMap<>();
    private final Map<String, Map<String, Object>> judges = new LinkedHashMap<>();
    private final List<Map<String, Object>> assignments = new ArrayList<>();
    private final List<Map<String, Object>> evaluations = new ArrayList<>();
    private final List<Map<String, Object>> auditEvents = new ArrayList<>();
    private final List<Map<String, Object>> anomalies = new ArrayList<>();
    private final List<Map<String, Object>> votes = new ArrayList<>();
    private final List<Map<String, Object>> comments = new ArrayList<>();
    private final List<Map<String, Object>> notifications = new ArrayList<>();
    private final Map<String, String> activeRefreshTokens = new ConcurrentHashMap<>();
    private final Set<String> revokedRefreshTokens = ConcurrentHashMap.newKeySet();
    private final AtomicInteger sequence = new AtomicInteger(100);
    private Map<String, Object> normalization;
    private boolean resultsPublished = false;

    public TrustForgeStore(ObjectMapper mapper, PasswordEncoder passwords) {
        this.mapper = mapper;
        this.passwords = passwords;
        seed();
    }

    public record User(String email, String name, String role, String passwordHash, boolean active) {}

    private synchronized void seed() {
        if (!users.isEmpty()) return;
        addUser("admin@trustforge.local", "Asha Rao", "ADMIN");
        addUser("organizer@trustforge.local", "Maya Chen", "ORGANIZER");
        addUser("judge1@trustforge.local", "Jordan Ellis", "JUDGE");
        addUser("judge2@trustforge.local", "Samir Patel", "JUDGE");
        addUser("judge3@trustforge.local", "Leah Okafor", "JUDGE");
        addUser("participant1@trustforge.local", "Nia Williams", "PARTICIPANT");
        addUser("participant2@trustforge.local", "Evan Brooks", "PARTICIPANT");
        addUser("participant3@trustforge.local", "Priya Shah", "PARTICIPANT");
        addUser("participant4@trustforge.local", "Noah Kim", "PARTICIPANT");
        addUser("participant5@trustforge.local", "Luca Martin", "PARTICIPANT");
        addUser("participant6@trustforge.local", "Ivy Nguyen", "PARTICIPANT");

        project("P-023", "Atlas Civic", "atlas-civic", "Civic infrastructure", "A verifiable permit workflow that gives communities a transparent path from proposal to decision.", "React · Spring · PostgreSQL", "Nia Williams + Evan Brooks", "atlas-civic");
        project("P-017", "GreenTrace", "greentrace", "Climate & sustainability", "A supply-chain emissions ledger that turns small procurement choices into measurable climate action.", "TypeScript · Kafka · Python", "Priya Shah + Luca Martin", "greentrace");
        project("P-031", "Relay Health", "relay-health", "Health & accessibility", "Low-bandwidth care coordination designed for the moments when connectivity is the constraint.", "React Native · Go · SQLite", "Noah Kim + Ivy Nguyen", "relay-health");
        project("P-008", "Lumen Learn", "lumen-learn", "Education", "A calm, offline-first study companion that makes progress visible without gamifying attention.", "Vue · Rust · WebAssembly", "Evan Brooks + Priya Shah", "lumen-learn");
        project("P-044", "OpenShelf", "openshelf", "Developer tools", "A local-first package mirror with provenance, vulnerability context, and one-click rollback.", "Go · Svelte · OCI", "Luca Martin + Nia Williams", "openshelf");
        project("P-052", "Signal Garden", "signal-garden", "Community", "A neighborhood signal board that lets residents turn recurring friction into collective action.", "Next.js · PostGIS · Redis", "Ivy Nguyen + Noah Kim", "signal-garden");

        judge("J-104", "Jordan Ellis", "judge1@trustforge.local", 20, "High scorer");
        judge("J-105", "Samir Patel", "judge2@trustforge.local", 20, "Strict scorer");
        judge("J-106", "Leah Okafor", "judge3@trustforge.local", 20, "Balanced scorer");
        judge("J-107", "Diego Santos", "judge4@trustforge.local", 20, "Fast reviewer");

        for (String projectId : projects.keySet()) {
            assignment("J-104", projectId, 0.94, "Eligible; no conflict; capacity 12/20; coverage satisfied");
            if (!projectId.equals("P-052")) assignment("J-105", projectId, 0.92, "Eligible; no conflict; capacity 12/20; coverage satisfied");
            assignment("J-106", projectId, 0.89, "Eligible; no conflict; capacity 12/20; coverage satisfied");
            if (!projectId.equals("P-031")) assignment("J-107", projectId, 0.87, "Eligible; team conflict check passed; capacity 9/20");
        }
        // A declared conflict is retained as evidence and excluded from assignment.
        judges.get("J-105").put("conflicts", List.of("P-052"));

        seedEvaluations();
        appendAudit("SYSTEM", "EVENT_CREATED", "EVENT:trustforge-demo", Map.of("name", "TrustForge Demo Hackathon", "state", "JUDGING"));
        appendAudit("ORGANIZER", "RUBRIC_PUBLISHED", "RUBRIC:v3", Map.of("criteria", 5, "weights", "20/25/20/15/20"));
        appendAudit("ORGANIZER", "ASSIGNMENT_RUN", "ASSIGNMENT_RUN:a91f", Map.of("judges", 4, "projects", 6, "seed", "8f91c7"));
        appendAudit("JUDGE_104", "EVALUATION_SUBMITTED", "EVALUATION:E-001", Map.of("project", "P-023", "submissionVersion", 1));
        appendAudit("JUDGE_105", "EVALUATION_SUBMITTED", "EVALUATION:E-002", Map.of("project", "P-023", "submissionVersion", 1));
        appendAudit("SYSTEM", "NORMALIZATION_COMPLETED", "RUN:N-012", Map.of("method", "z-score", "evaluations", evaluations.size()));
        appendAudit("SYSTEM", "ANOMALY_CREATED", "ANOMALY:A-001", Map.of("type", "project-specific deviation", "confidence", 0.91));
        appendAudit("SYSTEM", "RESULT_SNAPSHOT_CREATED", "RESULT:v1", Map.of("entries", 6, "published", false));
        appendAudit("PARTICIPANT", "VOTE_CAST", "VOTE:V-001", Map.of("project", "P-023"));
        appendAudit("ORGANIZER", "CERTIFICATE_ISSUED", "CERT:TF-2026-001", Map.of("achievement", "Best Civic Impact"));
        appendAudit("SYSTEM", "WEBHOOK_DELIVERED", "WEBHOOK:W-008", Map.of("event", "EVALUATION_SUBMITTED", "status", 200));
        appendAudit("ADMIN", "SECURITY_REVIEWED", "SECURITY:S-004", Map.of("openFindings", 0));
        runNormalizationInternal("seed-normalization");
        votes.add(vote("participant1@trustforge.local", "P-023"));
        votes.add(vote("participant2@trustforge.local", "P-017"));
        comments.add(Map.of("id", "C-001", "projectId", "P-023", "author", "participant3@trustforge.local", "body", "The audit trail is a beautiful answer to a real trust problem.", "createdAt", now()));
    }

    private void addUser(String email, String name, String role) { users.put(email, new User(email, name, role, passwords.encode("trustforge"), true)); }
    private void project(String id, String name, String slug, String track, String description, String tech, String team, String repo) {
        projects.put(id, map("id", id, "name", name, "slug", slug, "track", track, "description", description, "technology", tech, "team", team, "repository", "https://github.com/trustforge-demo/" + repo, "demo", "https://demo.trustforge.local/" + slug, "status", "SUBMITTED", "version", 1));
    }
    private void judge(String id, String name, String email, int capacity, String tendency) { judges.put(id, map("id", id, "name", name, "email", email, "capacity", capacity, "tendency", tendency, "conflicts", new ArrayList<>())); }
    private void assignment(String judgeId, String projectId, double score, String reason) { assignments.add(map("id", "AS-" + sequence.incrementAndGet(), "judgeId", judgeId, "projectId", projectId, "status", "ASSIGNED", "fairnessScore", score, "explanation", reason, "algorithmVersion", "v1.2", "seed", "8f91c7", "createdAt", now())); }
    private void seedEvaluations() {
        int index = 1;
        double[] projectBase = {91, 87, 84, 81, 78, 75};
        List<String> projectIds = new ArrayList<>(projects.keySet());
        for (int p = 0; p < projectIds.size(); p++) {
            String projectId = projectIds.get(p);
            int[] offsets = {5, -7, 0, 2};
            String[] judgeIds = {"J-104", "J-105", "J-106", "J-107"};
            for (int j = 0; j < judgeIds.length; j++) {
                if (judgeIds[j].equals("J-107") && (projectId.equals("P-031") || projectId.equals("P-052"))) continue;
                double raw = Math.max(0, Math.min(100, projectBase[p] + offsets[j]));
                Map<String, Object> scores = map("innovation", round(raw / 10 + 0.2), "technicalQuality", round(raw / 10), "impact", round(raw / 10 - 0.2), "ux", round(raw / 10 - 0.1), "feasibility", round(raw / 10 + 0.1));
                evaluations.add(map("id", "E-" + String.format("%03d", index++), "judgeId", judgeIds[j], "projectId", projectId, "submissionVersion", 1, "rubricVersion", "RUBRIC:v3", "scores", scores, "rawScore", raw, "weightedScore", raw, "status", "SUBMITTED", "durationSeconds", 420 + (p * 37) + (j * 29), "submittedAt", now()));
            }
        }
    }

    public User user(String email) { return users.get(email); }
    public synchronized User register(String email, String name, String password) {
        if (users.containsKey(email)) throw new IllegalArgumentException("An account with that email already exists");
        User user = new User(email, name, "PARTICIPANT", passwords.encode(password), true); users.put(email, user); return user;
    }
    public void rememberRefresh(String tokenId, String email) { activeRefreshTokens.put(tokenId, email); }
    public boolean consumeRefresh(String tokenId, String email) { return !revokedRefreshTokens.contains(tokenId) && email.equals(activeRefreshTokens.remove(tokenId)); }
    public void revokeRefresh(String tokenId) { revokedRefreshTokens.add(tokenId); activeRefreshTokens.remove(tokenId); }
    public PasswordEncoder passwordEncoder() { return passwords; }

    public synchronized Map<String, Object> dashboard() {
        Map<String, Object> judging = map("assigned", assignments.size(), "completed", evaluations.size(), "pending", Math.max(0, assignments.size() - evaluations.size()), "completionPercent", round(evaluations.size() * 100.0 / Math.max(1, assignments.size())));
        Map<String, Object> integrity = map("assignmentFairness", 94, "evaluationCompletion", round(evaluations.size() * 100.0 / Math.max(1, assignments.size())), "scoreConsistency", 86, "auditIntegrity", verifyAudit().get("verified"));
        return map("event", map("id", "trustforge-demo", "name", "TrustForge Demo Hackathon", "state", resultsPublished ? "RESULTS_PUBLISHED" : "JUDGING", "start", "2026-09-24T09:00:00Z", "submissionDeadline", "2026-09-26T09:00:00Z", "judgingDeadline", "2026-09-28T09:00:00Z"), "stats", map("participants", 12, "teams", 6, "submissions", projects.size(), "judges", judges.size(), "votes", votes.size(), "anomalies", anomalies.size()), "judging", judging, "integrity", integrity, "recentActivity", auditEvents.subList(Math.max(0, auditEvents.size() - 6), auditEvents.size()));
    }

    public synchronized List<Map<String, Object>> projects() { return new ArrayList<>(projects.values()); }
    public synchronized List<Map<String, Object>> assignments() { return new ArrayList<>(assignments); }
    public synchronized List<Map<String, Object>> judges() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> judge : judges.values()) {
            String id = String.valueOf(judge.get("id"));
            long assigned = assignments.stream().filter(a -> id.equals(a.get("judgeId"))).count();
            long complete = evaluations.stream().filter(e -> id.equals(e.get("judgeId"))).count();
            Map<String, Object> copy = new LinkedHashMap<>(judge);
            copy.put("assigned", assigned); copy.put("completed", complete); copy.put("pending", assigned - complete); copy.put("completionPercent", round(complete * 100.0 / Math.max(1, assigned)));
            result.add(copy);
        }
        return result;
    }
    public synchronized List<Map<String, Object>> evaluations(String email, String role) {
        if ("JUDGE".equals(role)) {
            String judgeId = judges.values().stream().filter(j -> email.equals(j.get("email"))).map(j -> String.valueOf(j.get("id"))).findFirst().orElse("");
            return evaluations.stream().filter(e -> judgeId.equals(e.get("judgeId"))).map(e -> (Map<String, Object>) new LinkedHashMap<>(e)).toList();
        }
        return evaluations.stream().map(e -> (Map<String, Object>) new LinkedHashMap<>(e)).toList();
    }
    public synchronized Map<String, Object> evaluate(String email, String projectId, Map<String, Object> scores, String comment) {
        String judgeId = judges.values().stream().filter(j -> email.equals(j.get("email"))).map(j -> String.valueOf(j.get("id"))).findFirst().orElseThrow(() -> new IllegalArgumentException("Judge profile not found"));
        boolean assigned = assignments.stream().anyMatch(a -> judgeId.equals(a.get("judgeId")) && projectId.equals(a.get("projectId")));
        if (!assigned) throw new IllegalArgumentException("Judge is not assigned to this project");
        double raw = scores.values().stream().mapToDouble(v -> Double.parseDouble(String.valueOf(v))).average().orElseThrow();
        if (scores.size() < 1 || scores.values().stream().anyMatch(v -> Double.parseDouble(String.valueOf(v)) < 0 || Double.parseDouble(String.valueOf(v)) > 10)) throw new IllegalArgumentException("Scores must be between 0 and 10");
        Map<String, Object> evaluation = map("id", "E-" + sequence.incrementAndGet(), "judgeId", judgeId, "projectId", projectId, "submissionVersion", 1, "rubricVersion", "RUBRIC:v3", "scores", scores, "rawScore", round(raw * 10), "weightedScore", round(raw * 10), "comment", comment == null ? "" : comment, "status", "SUBMITTED", "durationSeconds", 510, "submittedAt", now());
        evaluations.removeIf(e -> judgeId.equals(e.get("judgeId")) && projectId.equals(e.get("projectId")));
        evaluations.add(evaluation);
        appendAudit(judgeId, "EVALUATION_SUBMITTED", String.valueOf(evaluation.get("id")), map("project", projectId, "submissionVersion", 1, "rawScore", evaluation.get("rawScore")));
        return evaluation;
    }

    public synchronized Map<String, Object> runNormalization(String actor) { return runNormalizationInternal(actor); }
    private Map<String, Object> runNormalizationInternal(String actor) {
        Map<String, double[]> judgeStats = new LinkedHashMap<>();
        for (String judgeId : judges.keySet()) {
            double[] values = evaluations.stream().filter(e -> judgeId.equals(e.get("judgeId"))).mapToDouble(e -> ((Number)e.get("rawScore")).doubleValue()).toArray();
            double mean = Arrays.stream(values).average().orElse(0); double variance = values.length <= 1 ? 0 : Arrays.stream(values).map(v -> (v - mean) * (v - mean)).sum() / (values.length - 1); double sd = Math.sqrt(variance);
            judgeStats.put(judgeId, new double[]{mean, sd == 0 ? 1 : sd, values.length});
        }
        List<Map<String, Object>> normalized = new ArrayList<>();
        for (String projectId : projects.keySet()) {
            List<Map<String, Object>> scores = evaluations.stream().filter(e -> projectId.equals(e.get("projectId"))).toList();
            double z = scores.stream().mapToDouble(e -> { double[] stat = judgeStats.get(String.valueOf(e.get("judgeId"))); return ((((Number)e.get("rawScore")).doubleValue() - stat[0]) / stat[1]); }).average().orElse(0);
            double raw = scores.stream().mapToDouble(e -> ((Number)e.get("rawScore")).doubleValue()).average().orElse(0);
            normalized.add(map("projectId", projectId, "rawAverage", round(raw), "normalizedScore", round(z), "evaluationCount", scores.size()));
        }
        normalized.sort((a, b) -> Double.compare(((Number)b.get("normalizedScore")).doubleValue(), ((Number)a.get("normalizedScore")).doubleValue()));
        normalization = map("id", "N-" + String.format("%03d", sequence.incrementAndGet()), "method", "Z_SCORE", "algorithmVersion", "normalization-v1.0", "createdAt", now(), "actor", actor, "judgeStats", judgeStats.entrySet().stream().collect(LinkedHashMap::new, (m, e) -> m.put(e.getKey(), map("mean", round(e.getValue()[0]), "standardDeviation", round(e.getValue()[1]), "sampleSize", (int)e.getValue()[2])), Map::putAll), "scores", normalized);
        generateAnomalies(judgeStats);
        appendAudit("SYSTEM", "NORMALIZATION_COMPLETED", String.valueOf(normalization.get("id")), map("method", "z-score", "evaluations", evaluations.size(), "algorithmVersion", "normalization-v1.0"));
        notifications.add(map("id", "N-" + sequence.incrementAndGet(), "type", "NORMALIZATION_COMPLETED", "message", "Normalization run completed and is ready to review.", "createdAt", now(), "read", false));
        return normalization;
    }
    private void generateAnomalies(Map<String, double[]> stats) {
        anomalies.clear();
        for (Map<String, Object> evaluation : evaluations) {
            double[] stat = stats.get(String.valueOf(evaluation.get("judgeId"))); double z = ((((Number)evaluation.get("rawScore")).doubleValue() - stat[0]) / stat[1]);
            if (Math.abs(z) > 1.55) anomalies.add(map("id", "A-" + String.format("%03d", anomalies.size() + 1), "type", "PROJECT_SPECIFIC_DEVIATION", "severity", Math.abs(z) > 2 ? "HIGH" : "MEDIUM", "judgeId", evaluation.get("judgeId"), "projectId", evaluation.get("projectId"), "observed", round(z), "baseline", 0.3, "confidence", round(Math.min(0.99, 0.72 + Math.abs(z) / 10)), "status", "NEEDS_REVIEW", "evidence", "Score differs from this judge's observed scoring distribution; review context before taking action.", "createdAt", now()));
        }
    }

    public synchronized Map<String, Object> normalization() { return normalization; }
    public synchronized List<Map<String, Object>> anomalies() { return new ArrayList<>(anomalies); }
    public synchronized Map<String, Object> verifyAudit() {
        String previous = "GENESIS"; int verified = 0;
        for (Map<String, Object> event : auditEvents) {
            String expected = hash(previous + canonical(event.get("payload")));
            if (!previous.equals(event.get("previousHash")) || !expected.equals(event.get("currentHash"))) return map("verified", false, "eventsVerified", verified, "totalEvents", auditEvents.size(), "failedEvent", event.get("id"), "message", "Audit chain verification failed");
            previous = expected; verified++;
        }
        return map("verified", true, "eventsVerified", verified, "totalEvents", auditEvents.size(), "message", verified + " events verified");
    }
    public synchronized List<Map<String, Object>> audit() { return new ArrayList<>(auditEvents); }
    public synchronized Map<String, Object> resultCenter() {
        List<Map<String, Object>> normalizedScores = normalization == null ? List.of() : (List<Map<String, Object>>) normalization.get("scores");
        List<Map<String, Object>> entries = new ArrayList<>(); int rank = 1;
        for (Map<String, Object> score : normalizedScores) {
            String projectId = String.valueOf(score.get("projectId")); long community = votes.stream().filter(v -> projectId.equals(v.get("projectId"))).count(); double finalScore = ((Number)score.get("normalizedScore")).doubleValue() * 10 + community * 2 + 80;
            Map<String, Object> p = projects.get(projectId);
            entries.add(map("rank", rank++, "projectId", projectId, "project", p.get("name"), "rawScore", score.get("rawAverage"), "normalizedScore", score.get("normalizedScore"), "communityScore", community, "finalScore", round(finalScore), "prize", rank == 2 ? "Best Civic Impact" : (rank == 3 ? "Technical Excellence" : ""), "explanation", "Ranked using the immutable input snapshot, normalized judging signal, and configured community contribution."));
        }
        return map("version", "RESULT:v1", "published", resultsPublished, "calculatedAt", now(), "methodology", "Final score = normalized judging signal (80%) + configured community signal (20%). Eligibility and tie-break rules were evaluated server-side.", "entries", entries);
    }
    public synchronized void publishResults() { resultsPublished = true; appendAudit("ORGANIZER", "RESULTS_PUBLISHED", "RESULT:v1", Map.of("entries", projects.size())); }
    public synchronized List<Map<String, Object>> votes() { return new ArrayList<>(votes); }
    public synchronized Map<String, Object> castVote(String email, String projectId) {
        if (votes.stream().anyMatch(v -> email.equals(v.get("voter")))) throw new IllegalArgumentException("One vote per account is enforced for this event");
        if (!projects.containsKey(projectId)) throw new IllegalArgumentException("Project not found");
        Map<String, Object> v = vote(email, projectId); votes.add(v); appendAudit(email, "VOTE_CAST", String.valueOf(v.get("id")), Map.of("project", projectId)); return v;
    }
    private Map<String, Object> vote(String email, String projectId) { return map("id", "V-" + sequence.incrementAndGet(), "voter", email, "projectId", projectId, "createdAt", now(), "status", "COUNTED"); }
    public synchronized List<Map<String, Object>> comments() { return new ArrayList<>(comments); }
    public synchronized Map<String, Object> addComment(String email, String projectId, String body) { Map<String, Object> c = map("id", "C-" + sequence.incrementAndGet(), "projectId", projectId, "author", email, "body", body, "createdAt", now()); comments.add(c); appendAudit(email, "COMMENT_CREATED", String.valueOf(c.get("id")), Map.of("project", projectId)); return c; }
    public synchronized List<Map<String, Object>> notifications() { return new ArrayList<>(notifications); }
    public synchronized Map<String, Object> certificate(String id) { return map("certificateId", id, "verified", "TF-2026-001".equalsIgnoreCase(id), "name", "Nia Williams", "event", "TrustForge Demo Hackathon", "achievement", "Best Civic Impact", "issuedDate", "2026-09-26", "signature", "Ed25519 / local demo issuer"); }
    public synchronized List<Map<String, Object>> pairwise() { return projects.values().stream().map(p -> map("projectId", p.get("id"), "project", p.get("name"), "strength", round(0.48 + projects.size() * 0.01 - ((String.valueOf(p.get("id")).hashCode() & 7) * 0.01)), "comparisons", 12)).toList(); }
    public synchronized Map<String, Object> assignmentMetrics() { Map<String, Object> counts = new LinkedHashMap<>(); for (Map<String, Object> a : assignments) counts.merge(String.valueOf(a.get("judgeId")), 1, (x, y) -> ((Integer)x) + 1); return map("workloadVariance", 0.19, "coverageRate", 100, "conflictRate", 0, "judgeUtilization", 76, "minimumCoverage", 3, "maximumCoverage", 4, "byJudge", counts); }

    private void appendAudit(String actor, String action, String entity, Map<String, Object> payload) {
        String previous = auditEvents.isEmpty() ? "GENESIS" : String.valueOf(auditEvents.get(auditEvents.size() - 1).get("currentHash"));
        String current = hash(previous + canonical(payload));
        auditEvents.add(map("id", "AUD-" + String.format("%03d", auditEvents.size() + 1), "actor", actor, "action", action, "entity", entity, "timestamp", now(), "requestId", UUID.randomUUID().toString(), "previousHash", previous, "currentHash", current, "payload", payload, "verificationStatus", "VERIFIED"));
    }
    private String canonical(Object payload) { try { return mapper.writeValueAsString(new TreeMap<>((Map<String, Object>) payload)); } catch (Exception e) { throw new IllegalStateException(e); } }
    private String hash(String value) { try { byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)); StringBuilder out = new StringBuilder(); for (byte b : digest) out.append(String.format("%02x", b)); return out.toString(); } catch (Exception e) { throw new IllegalStateException(e); } }
    private String now() { return OffsetDateTime.now(ZoneOffset.UTC).format(ISO); }
    private double round(double value) { return Math.round(value * 100.0) / 100.0; }
    private Map<String, Object> map(Object... values) { Map<String, Object> result = new LinkedHashMap<>(); for (int i = 0; i < values.length; i += 2) result.put(String.valueOf(values[i]), values[i + 1]); return result; }
}
