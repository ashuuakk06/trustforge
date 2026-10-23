package com.trustforge.api.submissions;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;
import org.springframework.stereotype.Service;

@Service
public class SubmissionEventService {
    private final SubmissionEventRepository repository;
    private final Map<String, List<Consumer<SubmissionEventDocument>>> listeners = new ConcurrentHashMap<>();
    public SubmissionEventService(SubmissionEventRepository repository) { this.repository = repository; }

    public SubmissionEventDocument record(String projectId, String stage, String status, int progress, String message, Map<String, Object> details) {
        SubmissionEventDocument event = repository.save(new SubmissionEventDocument(projectId, repository.countByProjectId(projectId) + 1, stage, status, progress, message, details));
        listeners.getOrDefault(projectId, List.of()).forEach(listener -> listener.accept(event));
        return event;
    }
    public List<SubmissionEventDocument> events(String projectId) { return repository.findByProjectIdOrderBySequenceAsc(projectId); }
    public AutoCloseable subscribe(String projectId, Consumer<SubmissionEventDocument> listener) {
        listeners.computeIfAbsent(projectId, ignored -> new CopyOnWriteArrayList<>()).add(listener);
        return () -> listeners.getOrDefault(projectId, List.of()).remove(listener);
    }
}
