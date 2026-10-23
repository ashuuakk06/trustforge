package com.trustforge.api.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JudgeRepository extends JpaRepository<JudgeEntity, String> {
    List<JudgeEntity> findAllByOrderByIdAsc();
    Optional<JudgeEntity> findByUserId(String userId);
}
