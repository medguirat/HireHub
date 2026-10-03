package com.hirehub.service;

import com.hirehub.entity.Role;
import com.hirehub.mail.EmailContent;
import com.hirehub.mail.EmailLayout;
import com.hirehub.mail.MailSettings;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

/**
 * The emails the app sends. Every email:
 * <ul>
 *   <li>is sent only once the current transaction commits (a signup that fails sends nothing),</li>
 *   <li>is sent in the background, so the user's request never waits for the mail server and its
 *       answer never depends on it,</li>
 *   <li>never fails the user's action: a mail server error is logged, nothing more.</li>
 * </ul>
 * Where emails go (Mailpit or a real SMTP server) is decided by {@link com.hirehub.mail.MailConfig}.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String from;
    private final Executor mailExecutor;
    private final String frontendUrl;

    public EmailService(JavaMailSender mailSender, MailSettings settings,
                        @Qualifier("mailExecutor") Executor mailExecutor,
                        @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.mailSender = mailSender;
        this.from = settings.from();
        this.mailExecutor = mailExecutor;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    public void sendWelcomeEmail(String toEmail, String firstName, Role role) {
        queue(toEmail, "welcome", welcomeEmail(firstName, role));
    }

    /** The link is never logged: it is the secret. */
    public void sendPasswordResetEmail(String toEmail, String firstName, String link, int validityMinutes) {
        queue(toEmail, "password reset", passwordResetEmail(firstName, link, validityMinutes));
    }

    public EmailContent welcomeEmail(String firstName, Role role) {
        EmailLayout email = EmailLayout.email("Welcome to HireHub")
                .greeting("Hello " + firstName + ",")
                .footer("You received this email because a HireHub account was created with this address.");
        if (role == Role.RECRUITER) {
            email.preheader("Your recruiter account is ready. Publish your first offer.")
                    .paragraph("Your HireHub recruiter account is ready.")
                    .paragraph("Complete your company profile, publish your first job offer, then follow every "
                            + "application in one place: CVs, compatibility scores, interviews and evaluations.")
                    .button("Open my dashboard", frontendUrl + "/recruiter-dashboard");
        } else {
            email.preheader("Your candidate account is ready. Upload your CV to see how you match each offer.")
                    .paragraph("Your HireHub candidate account is ready.")
                    .paragraph("Upload your CV and complete your profile: HireHub then shows how well you match "
                            + "each offer, what to improve, and where each of your applications stands.")
                    .button("Open my dashboard", frontendUrl + "/candidate-dashboard");
        }
        return email.note("If you didn't create this account, you can ignore this email or reply to let us know.")
                .render();
    }

    public EmailContent passwordResetEmail(String firstName, String link, int validityMinutes) {
        return EmailLayout.email("Reset your HireHub password")
                .preheader("Choose a new password. The link expires in " + validityMinutes + " minutes.")
                .greeting("Hello " + firstName + ",")
                .paragraph("Someone (hopefully you) asked to reset the password of your HireHub account.")
                .button("Choose a new password", link)
                .note("The link works once and expires in " + validityMinutes + " minutes.")
                .note("If you didn't ask for this, ignore this email: your password stays the same.")
                .footer("You received this email because a password reset was requested for this address on HireHub.")
                .render();
    }

    /** Sends after the current transaction commits (right away if there is none), in the background. */
    private void queue(String to, String kind, EmailContent content) {
        Runnable send = () -> {
            try {
                mailExecutor.execute(() -> deliver(to, kind, content));
            } catch (RejectedExecutionException e) {
                log.warn("The {} email to {} was dropped: the mail queue is full", kind, masked(to));
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
        } else {
            send.run();
        }
    }

    private void deliver(String to, String kind, EmailContent content) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(content.subject());
            helper.setText(content.text(), content.html());
            mailSender.send(message);
            log.info("Sent the {} email to {}", kind, masked(to));
        } catch (MessagingException | RuntimeException e) {
            log.warn("Could not send the {} email to {}: {}", kind, masked(to), e.getMessage());
        }
    }

    /** "rita@test.com" -> "r***@test.com": enough to follow a case in the logs, without the full address. */
    static String masked(String email) {
        int at = email == null ? -1 : email.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        return email.charAt(0) + "***" + email.substring(at);
    }
}
