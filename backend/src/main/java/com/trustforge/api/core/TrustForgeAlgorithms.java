package com.trustforge.api.core;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class TrustForgeAlgorithms {
    private TrustForgeAlgorithms() {}

    public static final List<Map<String, Object>> RUBRIC = List.of(
        Map.of("name", "Innovation", "key", "innovation", "weight", 20),
        Map.of("name", "Technical Quality", "key", "technicalQuality", "weight", 25),
        Map.of("name", "Impact", "key", "impact", "weight", 20),
        Map.of("name", "UX", "key", "ux", "weight", 15),
        Map.of("name", "Feasibility", "key", "feasibility", "weight", 20)
    );
    public static final List<String> RUBRIC_KEYS = List.of("innovation", "technicalQuality", "impact", "ux", "feasibility");

    public record JudgeInput(String judgeId, int capacity, Set<String> conflicts) {}
    public record Assignment(String id, String judgeId, String projectId, String status, double fairnessScore,
                             String explanation, String algorithmVersion, String seed) {}
    public record AssignmentResult(List<Assignment> assignments, List<String> infeasible, Map<String, Object> metrics) {}
    public record EvaluationInput(String judgeId, String projectId, double rawScore) {}

    public static AssignmentResult assignJudges(List<JudgeInput> judges, List<String> projectIds, int minimumCoverage, String seed) {
        Map<String, Integer> loads = new LinkedHashMap<>();
        judges.forEach(j -> loads.put(j.judgeId(), 0));
        List<Assignment> assignments = new ArrayList<>();
        List<String> infeasible = new ArrayList<>();
        Set<String> chosen = new HashSet<>();
        for (String projectId : projectIds) {
            List<JudgeInput> eligible = judges.stream()
                .filter(j -> !j.conflicts().contains(projectId) && loads.getOrDefault(j.judgeId(), 0) < j.capacity())
                .sorted(Comparator.comparingInt((JudgeInput j) -> loads.getOrDefault(j.judgeId(), 0))
                    .thenComparingDouble(j -> stableScore(seed, projectId + ":" + j.judgeId())))
                .toList();
            int target = Math.min(minimumCoverage, eligible.size());
            if (eligible.size() < minimumCoverage) infeasible.add(projectId + ": only " + eligible.size() + " eligible judges; required " + minimumCoverage);
            for (JudgeInput judge : eligible.subList(0, target)) {
                String key = judge.judgeId() + ":" + projectId;
                if (!chosen.add(key)) continue;
                int load = loads.getOrDefault(judge.judgeId(), 0);
                loads.put(judge.judgeId(), load + 1);
                double fairness = round(Math.max(0.5, 1 - load / (double) Math.max(1, judge.capacity())));
                assignments.add(new Assignment("AS-" + (assignments.size() + 1), judge.judgeId(), projectId, "ASSIGNED", fairness,
                    "Eligible; no declared conflict; workload " + load + "/" + judge.capacity() + "; coverage target " + target + "/" + minimumCoverage,
                    "v2.0", seed));
            }
        }
        double mean = loads.values().stream().mapToDouble(Integer::doubleValue).average().orElse(0);
        double variance = loads.values().stream().mapToDouble(load -> Math.pow(load - mean, 2)).average().orElse(0);
        Map<String, Long> coverage = new HashMap<>();
        assignments.forEach(a -> coverage.merge(a.projectId(), 1L, Long::sum));
        long covered = projectIds.stream().filter(id -> coverage.getOrDefault(id, 0L) >= minimumCoverage).count();
        long maxCoverage = coverage.values().stream().mapToLong(Long::longValue).max().orElse(0);
        long minCoverage = projectIds.stream().mapToLong(id -> coverage.getOrDefault(id, 0L)).min().orElse(0);
        int totalCapacity = judges.stream().mapToInt(JudgeInput::capacity).sum();
        Map<String, JudgeInput> judgesById = judges.stream().collect(java.util.stream.Collectors.toMap(JudgeInput::judgeId, j -> j));
        long conflictedAssignments = assignments.stream().filter(a -> judgesById.get(a.judgeId()).conflicts().contains(a.projectId())).count();
        double conflictRate = assignments.isEmpty() ? 0 : round(conflictedAssignments * 100.0 / assignments.size());
        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("workloadVariance", round(variance));
        metrics.put("coverageRate", projectIds.isEmpty() ? 100 : round(covered * 100.0 / projectIds.size()));
        metrics.put("conflictRate", conflictRate);
        metrics.put("judgeUtilization", round(assignments.size() * 100.0 / Math.max(1, totalCapacity)));
        metrics.put("minimumCoverage", minCoverage);
        metrics.put("maximumCoverage", maxCoverage);
        metrics.put("byJudge", loads);
        return new AssignmentResult(assignments, infeasible, metrics);
    }

    public static Map<String, Object> normalize(List<EvaluationInput> evaluations, List<String> projectIds, List<String> judgeIds) {
        Map<String, Map<String, Double>> stats = new LinkedHashMap<>();
        for (String judgeId : judgeIds) {
            List<Double> values = evaluations.stream().filter(e -> e.judgeId().equals(judgeId)).map(EvaluationInput::rawScore).toList();
            double mean = values.stream().mapToDouble(Double::doubleValue).average().orElse(0);
            double variance = values.size() > 1 ? values.stream().mapToDouble(v -> Math.pow(v - mean, 2)).sum() / (values.size() - 1) : 0;
            Map<String, Double> stat = new LinkedHashMap<>();
            stat.put("mean", round(mean));
            stat.put("standardDeviation", round(Math.sqrt(variance) == 0 ? 1 : Math.sqrt(variance)));
            stat.put("sampleSize", (double) values.size());
            stats.put(judgeId, stat);
        }
        List<Map<String, Object>> scores = new ArrayList<>();
        for (String projectId : projectIds) {
            List<EvaluationInput> rows = evaluations.stream().filter(e -> e.projectId().equals(projectId)).toList();
            double rawAverage = rows.stream().mapToDouble(EvaluationInput::rawScore).average().orElse(0);
            double normalized = rows.stream().mapToDouble(e -> {
                Map<String, Double> stat = stats.getOrDefault(e.judgeId(), Map.of("mean", 0.0, "standardDeviation", 1.0));
                return (e.rawScore() - stat.get("mean")) / stat.get("standardDeviation");
            }).average().orElse(0);
            scores.add(Map.of("projectId", projectId, "rawAverage", round(rawAverage), "normalizedScore", round(normalized), "evaluationCount", rows.size()));
        }
        scores.sort(Comparator.comparingDouble((Map<String, Object> row) -> ((Number) row.get("normalizedScore")).doubleValue()).reversed());
        List<Map<String, Object>> anomalies = new ArrayList<>();
        for (EvaluationInput evaluation : evaluations) {
            Map<String, Double> stat = stats.get(evaluation.judgeId());
            if (stat == null) continue;
            double observed = (evaluation.rawScore() - stat.get("mean")) / stat.get("standardDeviation");
            if (Math.abs(observed) <= 1.55) continue;
            anomalies.add(Map.of("judgeId", evaluation.judgeId(), "projectId", evaluation.projectId(), "observed", round(observed),
                "severity", Math.abs(observed) > 2 ? "HIGH" : "MEDIUM", "confidence", round(Math.min(0.99, 0.72 + Math.abs(observed) / 10))));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("judgeStats", stats);
        result.put("scores", scores);
        result.put("anomalies", anomalies);
        return result;
    }

    public static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte item : digest) hex.append(String.format("%02x", item));
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    public static double round(double value) { return Math.round(value * 100.0) / 100.0; }
    private static double stableScore(String seed, String value) {
        String hash = sha256(seed + ":" + value);
        return Long.parseUnsignedLong(hash.substring(0, 8), 16) / (double) 0xffffffffL;
    }
}
