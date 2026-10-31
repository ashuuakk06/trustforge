package com.trustforge.api.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.trustforge.api.persistence.RefreshTokenEntity;
import com.trustforge.api.persistence.RefreshTokenRepository;
import com.trustforge.api.persistence.UserRepository;
import com.trustforge.api.web.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
  @Mock private UserRepository users;
  @Mock private RefreshTokenRepository refreshTokens;
  @Mock private PasswordEncoder passwords;
  @Mock private TokenService tokenService;

  @Test
  void refreshTokenReuseRevokesItsFamilyEvenWhenTheRequestIsRejected() throws Exception {
    RefreshTokenEntity reused = token("token-1", "family-1");
    reused.markUsed();
    RefreshTokenEntity sibling = token("token-2", "family-1");
    when(refreshTokens.findByTokenHash(org.mockito.ArgumentMatchers.anyString()))
        .thenReturn(Optional.of(reused));
    when(refreshTokens.findByFamilyId("family-1")).thenReturn(List.of(reused, sibling));
    AuthService service = new AuthService(users, refreshTokens, passwords, tokenService, 7);

    assertThrows(ApiException.class, () -> service.rotate("replayed-token"));

    assertThat(reused.getRevokedAt()).isNotNull();
    assertThat(sibling.getRevokedAt()).isNotNull();
    assertThat(
            AuthService.class
                .getMethod("rotate", String.class)
                .getAnnotation(Transactional.class)
                .noRollbackFor())
        .contains(ApiException.class);
  }

  private static RefreshTokenEntity token(String id, String family) {
    return new RefreshTokenEntity(
        id, "USR-1", family, "hash-" + id, Instant.now().plusSeconds(3600));
  }
}
