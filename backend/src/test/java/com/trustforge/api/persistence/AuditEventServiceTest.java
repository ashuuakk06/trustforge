package com.trustforge.api.persistence;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuditEventServiceTest {
    @Mock private AuditEventRepository repository;

    @Test
    void appendsHashedAuditRecordsToJpaRepository() {
        when(repository.findTop50ByOrderBySequenceDesc()).thenReturn(List.of());
        when(repository.saveAndFlush(any(AuditEventEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        AuditEventService service = new AuditEventService(repository, new ObjectMapper());

        service.append("organizer@trustforge.local", "ASSIGNMENT_RUN", "ASSIGNMENT_RUN:8f91c7", Map.of("seed", "8f91c7"));

        verify(repository).saveAndFlush(any(AuditEventEntity.class));
    }
}
