package com.trustforge.api.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.trustforge.api.core.TrustForgeAlgorithms;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditEventService {
    private static final String GENESIS = "GENESIS";
    private final AuditEventRepository repository;
    private final ObjectMapper canonicalMapper;

    public AuditEventService(AuditEventRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.canonicalMapper = mapper.copy().configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    @Transactional
    public synchronized AuditEventEntity append(String actor, String action, String entity, Map<String, Object> payload) {
        String previous = repository.findTop50ByOrderBySequenceDesc().stream().findFirst().map(AuditEventEntity::getCurrentHash).orElse(GENESIS);
        String hash = hash(previous, payload);
        AuditEventEntity event = new AuditEventEntity("AUD-" + UUID.randomUUID(), actor, action, entity, UUID.randomUUID().toString(), previous, hash, new LinkedHashMap<>(payload));
        return repository.saveAndFlush(event);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> verify() {
        List<AuditEventEntity> events = repository.findAllByOrderBySequenceAsc();
        String previous = GENESIS;
        boolean verified = true;
        long verifiedCount = 0;
        for (AuditEventEntity event : events) {
            String calculated = hash(previous, event.getPayload());
            if (!previous.equals(event.getPreviousHash()) || !calculated.equals(event.getCurrentHash())) verified = false;
            else verifiedCount++;
            previous = event.getCurrentHash();
        }
        return Map.of("verified", verified, "eventsVerified", verifiedCount, "totalEvents", events.size(),
            "message", verified ? "All event links and payload hashes match" : "The audit chain contains a mismatch");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> data() {
        List<AuditEventEntity> all = repository.findTop50ByOrderBySequenceDesc();
        List<Map<String, Object>> items = new ArrayList<>();
        for (int i = all.size() - 1; i >= 0; i--) items.add(toMap(all.get(i)));
        return Map.of("items", items, "verification", verify());
    }

    public Map<String, Object> toMap(AuditEventEntity event) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", event.getId()); row.put("sequence", event.getSequence()); row.put("actor", event.getActor()); row.put("action", event.getAction());
        row.put("entity", event.getEntity()); row.put("requestId", event.getRequestId()); row.put("previousHash", event.getPreviousHash());
        row.put("currentHash", event.getCurrentHash()); row.put("verificationStatus", event.getVerificationStatus()); row.put("payload", event.getPayload());
        row.put("timestamp", event.getCreatedAt());
        return row;
    }

    public String canonicalJson(Object value) {
        try { return canonicalMapper.writeValueAsString(value); }
        catch (Exception e) { throw new IllegalArgumentException("Could not serialize audit payload", e); }
    }

    private String hash(String previous, Object payload) { return TrustForgeAlgorithms.sha256(previous + canonicalJson(payload)); }
}
