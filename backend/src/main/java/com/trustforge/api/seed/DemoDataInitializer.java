package com.trustforge.api.seed;

import com.trustforge.api.core.TrustForgeAlgorithms;
import com.trustforge.api.persistence.AssignmentRepository;
import com.trustforge.api.persistence.AuditEventRepository;
import com.trustforge.api.persistence.AuditEventService;
import com.trustforge.api.persistence.EvaluationEntity;
import com.trustforge.api.persistence.EvaluationRepository;
import com.trustforge.api.persistence.EventEntity;
import com.trustforge.api.persistence.EventRepository;
import com.trustforge.api.persistence.JudgeEntity;
import com.trustforge.api.persistence.JudgeRepository;
import com.trustforge.api.persistence.NormalizationRunRepository;
import com.trustforge.api.persistence.ProjectEntity;
import com.trustforge.api.persistence.ProjectRepository;
import com.trustforge.api.persistence.UserEntity;
import com.trustforge.api.persistence.UserRepository;
import com.trustforge.api.platform.PlatformService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DemoDataInitializer implements ApplicationRunner {
    private static final String EVENT_ID = "trustforge-demo";
    private final boolean enabled;
    private final UserRepository users;
    private final EventRepository events;
    private final ProjectRepository projects;
    private final JudgeRepository judges;
    private final EvaluationRepository evaluations;
    private final AssignmentRepository assignments;
    private final AuditEventRepository auditRepository;
    private final NormalizationRunRepository normalizationRuns;
    private final PasswordEncoder passwords;
    private final JdbcTemplate jdbc;
    private final AuditEventService audit;
    private final PlatformService platform;

    public DemoDataInitializer(@Value("${trustforge.seed-demo:true}") boolean enabled, UserRepository users, EventRepository events,
            ProjectRepository projects, JudgeRepository judges, EvaluationRepository evaluations, AssignmentRepository assignments,
            AuditEventRepository auditRepository, NormalizationRunRepository normalizationRuns,
            PasswordEncoder passwords, JdbcTemplate jdbc, AuditEventService audit, PlatformService platform) {
        this.enabled = enabled; this.users = users; this.events = events; this.projects = projects; this.judges = judges; this.evaluations = evaluations;
        this.assignments = assignments; this.auditRepository = auditRepository; this.normalizationRuns = normalizationRuns;
        this.passwords = passwords; this.jdbc = jdbc; this.audit = audit; this.platform = platform;
    }

    @Override public void run(ApplicationArguments args) {
        if (!enabled || (users.count() >= 12 && projects.count() >= 6 && assignments.count() >= projects.count() * 3 && normalizationRuns.count() > 0 && auditRepository.count() > 0)) return;
        String passwordHash = passwords.encode("trustforge");
        List<UserEntity> accountSeeds = List.of(
            user("admin@trustforge.local", "Asha Rao", "ADMIN", passwordHash),
            user("organizer@trustforge.local", "Maya Chen", "ORGANIZER", passwordHash),
            user("judge1@trustforge.local", "Jordan Ellis", "JUDGE", passwordHash),
            user("judge2@trustforge.local", "Samir Patel", "JUDGE", passwordHash),
            user("judge3@trustforge.local", "Leah Okafor", "JUDGE", passwordHash),
            user("judge4@trustforge.local", "Diego Santos", "JUDGE", passwordHash),
            user("participant1@trustforge.local", "Nia Williams", "PARTICIPANT", passwordHash),
            user("participant2@trustforge.local", "Evan Brooks", "PARTICIPANT", passwordHash),
            user("participant3@trustforge.local", "Priya Shah", "PARTICIPANT", passwordHash),
            user("participant4@trustforge.local", "Noah Kim", "PARTICIPANT", passwordHash),
            user("participant5@trustforge.local", "Luca Martin", "PARTICIPANT", passwordHash),
            user("participant6@trustforge.local", "Ivy Nguyen", "PARTICIPANT", passwordHash)
        );
        List<UserEntity> accountRows = new ArrayList<>();
        for (UserEntity seed : accountSeeds) accountRows.add(users.findByEmailIgnoreCase(seed.getEmail()).orElseGet(() -> users.save(seed)));
        Map<String, String> userIds = new HashMap<>(); accountRows.forEach(user -> userIds.put(user.getEmail(), user.getId()));

        Instant starts = Instant.parse("2026-10-22T09:00:00Z");
        if (!events.existsById(EVENT_ID)) events.save(new EventEntity(EVENT_ID, "TrustForge Demo Hackathon", "JUDGING", starts, Instant.parse("2026-10-25T09:00:00Z"), Instant.parse("2026-10-28T09:00:00Z")));
        List<Object[]> projectData = List.of(
            new Object[]{"P-023", "Atlas Civic", "atlas-civic", "Civic infrastructure", "A verifiable permit workflow that gives communities a transparent path from proposal to decision.", "Java · React · PostgreSQL", "Nia Williams + Evan Brooks", "atlas-civic", "A city permit process can be difficult to track.", "A transparent review and notification workflow helps residents follow each decision."},
            new Object[]{"P-017", "GreenTrace", "greentrace", "Climate & sustainability", "A supply-chain emissions ledger that turns small procurement choices into measurable climate action.", "Java · Redis · PostgreSQL", "Priya Shah + Luca Martin", "greentrace", "Small suppliers struggle to report emissions consistently.", "A traceable ledger measures and explains emissions throughout procurement."},
            new Object[]{"P-031", "Relay Health", "relay-health", "Health & accessibility", "Low-bandwidth care coordination designed for the moments when connectivity is the constraint.", "React · Spring Boot · MongoDB", "Noah Kim + Ivy Nguyen", "relay-health", "Care teams lose context when connectivity is limited.", "A low-bandwidth care record synchronizes when a device is back online."},
            new Object[]{"P-008", "Lumen Learn", "lumen-learn", "Education", "A calm, offline-first study companion that makes progress visible without gamifying attention.", "Java · React · Web", "Evan Brooks + Priya Shah", "lumen-learn", "Learners need a reliable offline study routine.", "A local-first study planner tracks progress without distracting rewards."},
            new Object[]{"P-044", "OpenShelf", "openshelf", "Developer tools", "A local-first package mirror with provenance, vulnerability context, and one-click rollback.", "Java · PostgreSQL · Docker", "Luca Martin + Nia Williams", "openshelf", "Package provenance is hard to audit in a fast release.", "A package mirror records source provenance and supports a tested rollback."},
            new Object[]{"P-052", "Signal Garden", "signal-garden", "Community", "A neighborhood signal board that lets residents turn recurring friction into collective action.", "React · Spring Boot · Redis", "Ivy Nguyen + Noah Kim", "signal-garden", "Residents lack a reliable way to track recurring local issues.", "A neighborhood board groups reports and shows the progress of community requests."}
        );
        List<ProjectEntity> projectRows = new ArrayList<>();
        for (int i = 0; i < projectData.size(); i++) {
            Object[] p = projectData.get(i);
            if (projects.existsById((String) p[0])) continue;
            ProjectEntity project = new ProjectEntity((String)p[0], EVENT_ID, userIds.get("participant" + (i + 1) + "@trustforge.local"), (String)p[1], (String)p[2], (String)p[3], (String)p[4], (String)p[8], (String)p[9], (String)p[5], (String)p[6], "https://github.com/trustforge-demo/" + p[7], "https://demo.trustforge.local/" + p[2], List.of());
            project.setStatus("SUBMITTED"); project.setProcessingStatus("READY"); project.setContentHash(TrustForgeAlgorithms.sha256(project.getName() + project.getDescription())); projectRows.add(project);
        }
        projects.saveAll(projectRows);
        List<JudgeEntity> judgeRows = List.of(new JudgeEntity("J-104", userIds.get("judge1@trustforge.local"), 20, "High scorer"), new JudgeEntity("J-105", userIds.get("judge2@trustforge.local"), 20, "Strict scorer"), new JudgeEntity("J-106", userIds.get("judge3@trustforge.local"), 20, "Balanced scorer"), new JudgeEntity("J-107", userIds.get("judge4@trustforge.local"), 20, "Fast reviewer"));
        judges.saveAll(judgeRows.stream().filter(judge -> !judges.existsById(judge.getId())).toList());
        jdbc.update("INSERT INTO judge_conflicts(judge_id,project_id,reason) VALUES (?,?,?) ON CONFLICT DO NOTHING", "J-105", "P-052", "Declared conflict of interest");
        if (auditRepository.count() == 0) audit.append("SYSTEM", "EVENT_CREATED", "EVENT:" + EVENT_ID, Map.of("name", "TrustForge Demo Hackathon", "state", "JUDGING"));
        if (assignments.count() < projects.count() * 3) platform.runAssignments("SYSTEM");

        List<EvaluationEntity> evaluationRows = new ArrayList<>();
        int[] bases = {91, 87, 84, 81, 78, 75}; int[] offsets = {5, -7, 0, 2};
        Map<String, Integer> judgeIndex = Map.of("J-104", 0, "J-105", 1, "J-106", 2, "J-107", 3);
        for (var assignment : assignments.findAllByOrderByProjectIdAscJudgeIdAsc()) {
            if (evaluations.findByJudgeIdAndProjectIdAndSubmissionVersion(assignment.getJudgeId(), assignment.getProjectId(), 1).isPresent()) continue;
            int projectIndex = Integer.parseInt(assignment.getProjectId().substring(2)) == 0 ? 0 : projectData.stream().map(row -> String.valueOf(row[0])).toList().indexOf(assignment.getProjectId());
            int raw = Math.max(0, Math.min(100, bases[Math.max(0, projectIndex)] + offsets[judgeIndex.get(assignment.getJudgeId())]));
            double average = raw / 10.0;
            Map<String, Double> scores = Map.of("innovation", average + .2, "technicalQuality", average, "impact", average - .2, "ux", average - .1, "feasibility", average + .1);
            double weighted = scores.get("innovation") * 2 + scores.get("technicalQuality") * 2.5 + scores.get("impact") * 2 + scores.get("ux") * 1.5 + scores.get("feasibility") * 2;
            evaluationRows.add(new EvaluationEntity("E-SEED-" + UUID.randomUUID(), assignment.getJudgeId(), assignment.getProjectId(), scores, BigDecimal.valueOf(raw), BigDecimal.valueOf(weighted), "Seeded evidence note"));
        }
        evaluations.saveAll(evaluationRows);
        jdbc.update("INSERT INTO certificates(id,participant_name,event_name,achievement,issued_date,signature) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING", "TF-2026-001", "Nia Williams", "TrustForge Demo Hackathon", "Best Civic Impact", java.sql.Date.valueOf("2026-10-28"), "Ed25519 / local demo issuer");
        jdbc.update("INSERT INTO votes(id,voter_id,project_id) VALUES (?,?,?),(?,?,?) ON CONFLICT DO NOTHING", "V-001", userIds.get("participant5@trustforge.local"), "P-023", "V-002", userIds.get("participant6@trustforge.local"), "P-017");
        jdbc.update("INSERT INTO comments(id,author_id,project_id,body) VALUES (?,?,?,?) ON CONFLICT DO NOTHING", "C-001", userIds.get("participant3@trustforge.local"), "P-023", "The audit trail is a clear answer to a real trust problem.");
        for (UserEntity user : accountRows) jdbc.update("INSERT INTO notifications(id,user_id,type,message) VALUES (?,?,?,?) ON CONFLICT DO NOTHING", "NT-" + user.getId(), user.getId(), "EVENT_UPDATE", "TrustForge Demo Hackathon judging is open.");
        if (normalizationRuns.count() == 0) platform.runNormalization("SYSTEM");
    }

    private UserEntity user(String email, String name, String role, String passwordHash) { return new UserEntity("USR-" + email.substring(0, email.indexOf('@')), email, name, role, passwordHash); }
}
