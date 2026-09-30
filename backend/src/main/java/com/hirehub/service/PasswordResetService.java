package com.hirehub.service;

import com.hirehub.entity.PasswordResetToken;
import com.hirehub.entity.User;
import com.hirehub.exception.BadRequestException;
import com.hirehub.repository.PasswordResetTokenRepository;
import com.hirehub.repository.UserRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.concurrent.Executor;

/**
 * "Forgot password": a single-use link, valid for a limited time, sent by email.
 * <ul>
 *   <li>The token is 256 random bits; only its SHA-256 is stored.</li>
 *   <li>Asking for a link answers the same way whether or not the email has an account, and the
 *       email is sent in the background, so the answer doesn't reveal who is registered.</li>
 *   <li>A new link retires the previous ones; changing the password retires them all and signs
 *       the user out everywhere (login tokens issued before are refused).</li>
 * </ul>
 */
@Service
public class PasswordResetService {

    public static final String LINK_INVALID = "RESET_LINK_INVALID";
    /** At most one email per account per minute; the answer stays the same. */
    static final Duration RESEND_INTERVAL = Duration.ofSeconds(60);

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final Executor mailExecutor;
    private final Clock clock;
    private final String frontendUrl;
    private final int validityMinutes;

    public PasswordResetService(UserRepository userRepository, PasswordResetTokenRepository tokens,
                                PasswordEncoder passwordEncoder, EmailService emailService,
                                @Qualifier("mailExecutor") Executor mailExecutor, Clock clock,
                                @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl,
                                @Value("${app.password-reset.validity-minutes:45}") int validityMinutes) {
        this.userRepository = userRepository;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.mailExecutor = mailExecutor;
        this.clock = clock;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        this.validityMinutes = validityMinutes;
    }

    /** The answer to every request, whether or not the email has an account. */
    public String requestAnswer() {
        return "If an account exists for this email, we've sent a link to reset the password. "
                + "It works once and expires in " + validityMinutes + " minutes.";
    }

    @Transactional
    public String requestReset(String email) {
        userRepository.findByEmailIgnoreCase(email.trim()).ifPresent(this::sendLink);
        return requestAnswer();
    }

    private void sendLink(User user) {
        LocalDateTime now = LocalDateTime.now(clock);
        boolean sentRecently = tokens.findFirstByUserIdOrderByCreatedAtDesc(user.getId())
                .map(last -> last.getCreatedAt().isAfter(now.minus(RESEND_INTERVAL)))
                .orElse(false);
        if (sentRecently) {
            return;
        }
        tokens.retireAllForUser(user.getId(), now);

        byte[] secret = new byte[32];
        RANDOM.nextBytes(secret);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(secret);
        tokens.save(PasswordResetToken.builder()
                .user(user)
                .tokenHash(hash(token))
                .createdAt(now)
                .expiresAt(now.plusMinutes(validityMinutes))
                .build());

        // After "#", the token is never sent to any server (no logs, no Referer); the page reads it.
        String link = frontendUrl + "/reset-password#token=" + token;
        String to = user.getEmail();
        String firstName = user.getFirstName();
        afterCommit(() -> mailExecutor.execute(() -> emailService.sendPasswordResetEmail(to, firstName, link, validityMinutes)));
    }

    /** Lets the reset page say "this link has expired" before the user types a new password. */
    @Transactional(readOnly = true)
    public void checkLink(String token) {
        usableToken(token);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = usableToken(token);
        User user = resetToken.getUser();
        LocalDateTime now = LocalDateTime.now(clock);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setCredentialsChangedAt(Instant.now(clock));
        userRepository.save(user);
        tokens.retireAllForUser(user.getId(), now); // this link included: it works once
    }

    private PasswordResetToken usableToken(String token) {
        return tokens.findByTokenHash(hash(token == null ? "" : token.trim()))
                .filter(t -> t.isUsable(LocalDateTime.now(clock)))
                .orElseThrow(() -> new BadRequestException(LINK_INVALID,
                        "This reset link is invalid, has already been used or has expired. Please ask for a new one."));
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
