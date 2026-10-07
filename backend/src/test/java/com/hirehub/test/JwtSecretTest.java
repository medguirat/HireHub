package com.hirehub.test;

import com.hirehub.security.InvalidJwtSecretException;
import com.hirehub.security.InvalidJwtSecretFailureAnalyzer;
import com.hirehub.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.diagnostics.FailureAnalysis;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The signing key has no default: without a valid JWT_SECRET the application must refuse to start. */
class JwtSecretTest {

    private static final String VALID = Base64.getEncoder().encodeToString(new byte[48]);

    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(JwtService.class);

    @Test
    void aValidSecretSignsAndReadsTokens() {
        JwtService jwt = new JwtService(VALID, 60_000);
        assertThat(jwt.extractUsername(jwt.generateToken("someone@example.test"))).isEqualTo("someone@example.test");
    }

    @Test
    void tokensSignedWithAnotherSecretAreRejected() {
        String otherSecret = Base64.getEncoder().encodeToString("another-secret-of-at-least-32-bytes!!".getBytes());
        String token = new JwtService(otherSecret, 60_000).generateToken("someone@example.test");
        assertThatThrownBy(() -> new JwtService(VALID, 60_000).extractUsername(token))
                .isInstanceOf(io.jsonwebtoken.JwtException.class);
    }

    @Test
    void theApplicationDoesNotStartWithoutASecret() {
        // Explicitly empty: a JWT_SECRET in the environment would otherwise bind to jwt.secret.
        context.withPropertyValues("jwt.secret=").run(ctx -> {
            assertThat(ctx).hasFailed();
            assertThat(ctx.getStartupFailure()).rootCause()
                    .isInstanceOf(InvalidJwtSecretException.class)
                    .hasMessage("JWT_SECRET is not set.");
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"c2hvcnQ=", "not base64 at all!"})
    void theApplicationDoesNotStartWithAShortOrInvalidSecret(String secret) {
        context.withPropertyValues("jwt.secret=" + secret).run(ctx -> {
            assertThat(ctx).hasFailed();
            assertThat(ctx.getStartupFailure()).rootCause().isInstanceOf(InvalidJwtSecretException.class);
        });
    }

    @Test
    void theStartupErrorSaysWhatToDo() {
        assertThatThrownBy(() -> new JwtService("c2hvcnQ=", 60_000))
                .hasMessage("JWT_SECRET is too short (5 bytes); it must be at least 32 bytes (256 bits).");

        FailureAnalysis analysis = new InvalidJwtSecretFailureAnalyzer().analyze(new InvalidJwtSecretException("JWT_SECRET is not set."));
        assertThat(analysis.getDescription()).startsWith("JWT_SECRET is not set.");
        assertThat(analysis.getAction()).contains(".env").contains("npm run secret");
    }
}
