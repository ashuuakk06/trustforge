package com.trustforge.api.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NormalizationRunRepository extends JpaRepository<NormalizationRunEntity, String> {
    Optional<NormalizationRunEntity> findFirstByOrderByCreatedAtDesc();
}
