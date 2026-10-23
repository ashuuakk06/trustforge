package com.trustforge.api.platform;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class DashboardCache {
    private static final String KEY = "trustforge:dashboard:v1";
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    public DashboardCache(StringRedisTemplate redis, ObjectMapper mapper) { this.redis = redis; this.mapper = mapper; }
    public Map<String, Object> get() {
        try {
            String value = redis.opsForValue().get(KEY);
            return value == null ? null : mapper.readValue(value, new TypeReference<>() {});
        } catch (DataAccessException | java.io.IOException exception) { return null; }
    }
    public void put(Map<String, Object> value) {
        try { redis.opsForValue().set(KEY, mapper.writeValueAsString(value), Duration.ofSeconds(15)); }
        catch (DataAccessException | java.io.IOException ignored) { }
    }
    public void evict() { try { redis.delete(KEY); } catch (DataAccessException ignored) { } }
}
