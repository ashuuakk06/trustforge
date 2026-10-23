package com.trustforge.api.core;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class TrustForgeAlgorithmsTest {
    @Test
    void assignmentHonorsConflictsCapacityAndCoverage() {
        var judges = List.of(
            new TrustForgeAlgorithms.JudgeInput("J-1", 2, Set.of("P-1")),
            new TrustForgeAlgorithms.JudgeInput("J-2", 2, Set.of()),
            new TrustForgeAlgorithms.JudgeInput("J-3", 2, Set.of())
        );

        var result = TrustForgeAlgorithms.assignJudges(judges, List.of("P-1", "P-2"), 2, "fixed-seed");

        assertThat(result.infeasible()).isEmpty();
        assertThat(result.assignments()).hasSize(4);
        assertThat(result.assignments()).allSatisfy(a -> assertThat(a.judgeId() + ":" + a.projectId()).isNotEqualTo("J-1:P-1"));
        assertThat(result.metrics().get("coverageRate")).isEqualTo(100.0);
        assertThat(result.assignments()).extracting(a -> a.judgeId() + ":" + a.projectId()).doesNotContain("J-1:P-1");
    }

    @Test
    void normalizationUsesStableDenominatorForSingleScoreJudges() {
        var result = TrustForgeAlgorithms.normalize(
            List.of(new TrustForgeAlgorithms.EvaluationInput("J-1", "P-1", 80)), List.of("P-1", "P-2"), List.of("J-1", "J-2"));

        assertThat(result.get("scores")).asList().hasSize(2);
        @SuppressWarnings("unchecked") var stats = (java.util.Map<String, java.util.Map<String, Double>>) result.get("judgeStats");
        assertThat(stats.get("J-1").get("standardDeviation")).isEqualTo(1.0);
        assertThat(stats.get("J-2").get("sampleSize")).isEqualTo(0.0);
    }
}
