package com.trustforge.api.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<ProjectEntity, String> {
    List<ProjectEntity> findAllByOrderByCreatedAtAsc();
    long countByOwnerId(String ownerId);
}
