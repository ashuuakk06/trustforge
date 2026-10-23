package com.trustforge.api.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEventRepository extends JpaRepository<AuditEventEntity, Long> {
    List<AuditEventEntity> findAllByOrderBySequenceAsc();
    List<AuditEventEntity> findTop50ByOrderBySequenceDesc();
}
