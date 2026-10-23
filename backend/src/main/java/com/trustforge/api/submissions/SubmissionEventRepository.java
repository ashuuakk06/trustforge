package com.trustforge.api.submissions;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SubmissionEventRepository extends MongoRepository<SubmissionEventDocument, String> {
    List<SubmissionEventDocument> findByProjectIdOrderBySequenceAsc(String projectId);
    long countByProjectId(String projectId);
}
