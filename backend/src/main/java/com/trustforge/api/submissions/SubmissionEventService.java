package com.trustforge.api.submissions;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class SubmissionEventService {
  private final SubmissionEventRepository repository;

  public SubmissionEventService(SubmissionEventRepository repository) {
    this.repository = repository;
  }

  public SubmissionEventEntity record(
      String projectId,
      String stage,
      String status,
      int progress,
      String message,
      Map<String, Object> details) {
    return repository.save(
        new SubmissionEventEntity(projectId, stage, status, progress, message, details));
  }

  public List<SubmissionEventEntity> events(String projectId) {
    return repository.findByProjectIdOrderBySequenceAsc(projectId);
  }

  public List<SubmissionEventEntity> eventsAfter(String projectId, long sequence) {
    return repository.findByProjectIdAndSequenceGreaterThanOrderBySequenceAsc(projectId, sequence);
  }
}
