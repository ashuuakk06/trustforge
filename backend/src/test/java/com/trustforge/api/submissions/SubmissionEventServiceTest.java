package com.trustforge.api.submissions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SubmissionEventServiceTest {
  @Mock private SubmissionEventRepository repository;

  @Test
  void storesEventsInPostgresAndReadsOnlyEventsAfterTheLastSeenSequence() {
    when(repository.save(any(SubmissionEventEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    SubmissionEventEntity laterEvent =
        new SubmissionEventEntity("P-1", "HASHING", "COMPLETED", 55, "Fingerprint stored", Map.of());
    when(repository.findByProjectIdAndSequenceGreaterThanOrderBySequenceAsc("P-1", 4L))
        .thenReturn(List.of(laterEvent));
    SubmissionEventService service = new SubmissionEventService(repository);

    SubmissionEventEntity recorded =
        service.record("P-1", "HASHING", "COMPLETED", 55, "Fingerprint stored", Map.of());
    List<SubmissionEventEntity> polled = service.eventsAfter("P-1", 4L);

    assertThat(recorded.getProjectId()).isEqualTo("P-1");
    assertThat(recorded.getStage()).isEqualTo("HASHING");
    assertThat(recorded.getStatus()).isEqualTo("COMPLETED");
    assertThat(recorded.getProgress()).isEqualTo(55);
    assertThat(polled).containsExactly(laterEvent);
    verify(repository).findByProjectIdAndSequenceGreaterThanOrderBySequenceAsc("P-1", 4L);
  }
}
