package com.trustforge;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trustforge.store.TrustForgeStore;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TrustForgeStoreTest {
    private TrustForgeStore store() { return new TrustForgeStore(new ObjectMapper(), new BCryptPasswordEncoder(4)); }

    @Test void normalizationIsDeterministicAndDisclosesJudgeStats() {
        TrustForgeStore store = store();
        Map<String,Object> first = store.normalization();
        assertEquals("Z_SCORE", first.get("method"));
        assertEquals(6, ((java.util.List<?>) first.get("scores")).size());
        assertTrue(((Map<?,?>) first.get("judgeStats")).containsKey("J-104"));
        Map<String,Object> second = store.runNormalization("test");
        assertEquals(first.get("scores"), second.get("scores"));
    }

    @Test void auditChainDetectsPayloadTampering() {
        TrustForgeStore store = store();
        assertTrue((Boolean) store.verifyAudit().get("verified"));
        store.audit().get(2).put("payload", Map.of("seed", "tampered"));
        Map<String,Object> verification = store.verifyAudit();
        assertFalse((Boolean) verification.get("verified"));
        assertEquals("AUD-003", verification.get("failedEvent"));
    }

    @Test void assignmentExcludesDeclaredConflictAndRespectsCapacity() {
        TrustForgeStore store = store();
        var assignments = store.assignments();
        assertTrue(assignments.stream().noneMatch(a -> "J-105".equals(a.get("judgeId")) && "P-052".equals(a.get("projectId"))));
        assertTrue(assignments.stream().allMatch(a -> ((Number) a.get("fairnessScore")).doubleValue() >= 0 && ((Number) a.get("fairnessScore")).doubleValue() <= 1));
        assertEquals(100, store.assignmentMetrics().get("coverageRate"));
    }

    @Test void duplicateCommunityVoteIsRejected() {
        TrustForgeStore store = store();
        assertThrows(IllegalArgumentException.class, () -> store.castVote("participant1@trustforge.local", "P-017"));
        assertDoesNotThrow(() -> store.castVote("new-voter@trustforge.local", "P-017"));
    }
}
