package com.trustforge.api.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentRepository extends JpaRepository<AssignmentEntity, String> {
    List<AssignmentEntity> findAllByOrderByProjectIdAscJudgeIdAsc();
    List<AssignmentEntity> findByJudgeIdOrderByProjectIdAsc(String judgeId);
    boolean existsByJudgeIdAndProjectId(String judgeId, String projectId);
}
