package com.trustforge.api.submissions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SubmissionEventServiceTest {
    @Mock private SubmissionEventRepository repository;

    @Test
    void storesAndPublishesOrderedEventsToLiveSubscribers() throws Exception {
        when(repository.countByProjectId("P-1")).thenReturn(2L);
        when(repository.save(any(SubmissionEventDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SubmissionEventService service = new SubmissionEventService(repository);
        AtomicReference<SubmissionEventDocument> received = new AtomicReference<>();
        AutoCloseable subscription = service.subscribe("P-1", received::set);

        SubmissionEventDocument recorded = service.record("P-1", "HASHING", "COMPLETED", 55, "Fingerprint stored", java.util.Map.of());

        assertThat(recorded.getSequence()).isEqualTo(3);
        assertThat(received.get()).isSameAs(recorded);
        subscription.close();
    }
}
