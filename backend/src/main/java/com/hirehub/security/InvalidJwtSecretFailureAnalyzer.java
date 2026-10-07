package com.hirehub.security;

import org.springframework.boot.diagnostics.AbstractFailureAnalyzer;
import org.springframework.boot.diagnostics.FailureAnalysis;

/** Turns a missing or weak JWT secret into a short "APPLICATION FAILED TO START" explanation instead of a stack trace. */
public class InvalidJwtSecretFailureAnalyzer extends AbstractFailureAnalyzer<InvalidJwtSecretException> {

    @Override
    protected FailureAnalysis analyze(Throwable rootFailure, InvalidJwtSecretException cause) {
        return new FailureAnalysis(
                cause.getMessage() + " The backend needs it to sign login tokens and won't start without it.",
                "Set JWT_SECRET in the .env file at the root of the repository (or as an environment variable) "
                        + "to a random base64 key of at least " + JwtService.MIN_SECRET_BYTES + " bytes. "
                        + "Generate one with: npm run secret   (or: openssl rand -base64 48)",
                cause);
    }
}
