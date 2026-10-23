package com.trustforge.api.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EvaluationRepository extends JpaRepository<EvaluationEntity, String> {
    List<EvaluationEntity> findAllByOrderByProjectIdAscJudgeIdAsc();
    List<EvaluationEntity> findByJudgeIdOrderByProjectIdAsc(String judgeId);
    Optional<EvaluationEntity> findByJudgeIdAndProjectIdAndSubmissionVersion(String judgeId, String projectId, int submissionVersion);
    long countByJudgeId(String judgeId);
}
