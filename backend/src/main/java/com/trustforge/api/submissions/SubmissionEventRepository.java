package com.trustforge.api.submissions;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionEventRepository extends JpaRepository<SubmissionEventEntity, Long> {
  List<SubmissionEventEntity> findByProjectIdOrderBySequenceAsc(String projectId);

  List<SubmissionEventEntity> findByProjectIdAndSequenceGreaterThanOrderBySequenceAsc(
      String projectId, long sequence);
}
