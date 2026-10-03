package com.hirehub.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Properties;

/**
 * Where the app's emails go, chosen by {@code MAIL_MODE}:
 * <ul>
 *   <li>{@code mailpit} (default): Mailpit, the local test inbox that `npm run dev` and Docker start.
 *       Nothing leaves the machine; the E2E tests read the emails through Mailpit's API.</li>
 *   <li>{@code smtp}: a real mail server (e.g. Gmail with an app password, see the README), from the
 *       {@code SMTP_*} variables. An incomplete setting stops the backend at startup with the reason.</li>
 * </ul>
 */
@Configuration
public class MailConfig {

    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    @Bean
    public MailSettings mailSettings(@Value("${app.mail.mode:mailpit}") String mode,
                                     @Value("${app.mail.mailpit.host:localhost}") String mailpitHost,
                                     @Value("${app.mail.mailpit.port:1025}") int mailpitPort,
                                     @Value("${app.mail.smtp.host:}") String smtpHost,
                                     @Value("${app.mail.smtp.port:587}") int smtpPort,
                                     @Value("${app.mail.smtp.username:}") String smtpUsername,
                                     @Value("${app.mail.smtp.password:}") String smtpPassword,
                                     @Value("${app.mail.from:}") String from) {
        MailSettings.Mode parsed = parseMode(mode);
        if (parsed == MailSettings.Mode.MAILPIT) {
            return new MailSettings(parsed, mailpitHost.trim(), mailpitPort, "", "",
                    fromOrDefault(from, MailSettings.DEFAULT_FROM));
        }
        List<String> missing = new ArrayList<>();
        if (smtpHost.isBlank()) missing.add("SMTP_HOST");
        if (smtpUsername.isBlank()) missing.add("SMTP_USERNAME");
        if (smtpPassword.isBlank()) missing.add("SMTP_PASSWORD");
        if (!missing.isEmpty()) {
            throw new IllegalStateException("MAIL_MODE=smtp needs " + String.join(", ", missing)
                    + " (see .env.example and the README, \"Emails\"). Use MAIL_MODE=mailpit for the local test inbox.");
        }
        // Gmail and most providers only accept the authenticated address as the sender.
        String defaultFrom = "HireHub <" + smtpUsername.trim() + ">";
        return new MailSettings(parsed, smtpHost.trim(), smtpPort, smtpUsername.trim(),
                smtpPassword.replace(" ", ""), fromOrDefault(from, defaultFrom));
    }

    @Bean
    public JavaMailSender javaMailSender(MailSettings settings) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(settings.host());
        sender.setPort(settings.port());
        sender.setDefaultEncoding(StandardCharsets.UTF_8.name());

        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");
        if (settings.mode() == MailSettings.Mode.SMTP) {
            sender.setUsername(settings.username());
            sender.setPassword(settings.password());
            props.put("mail.smtp.auth", "true");
            if (settings.port() == 465) {
                props.put("mail.smtp.ssl.enable", "true");          // implicit TLS
            } else {
                props.put("mail.smtp.starttls.enable", "true");     // 587: upgrade to TLS, required
                props.put("mail.smtp.starttls.required", "true");
            }
        }
        log.info("Emails: {} ({}:{}), sender {}", settings.mode().name().toLowerCase(Locale.ROOT),
                settings.host(), settings.port(), settings.from());
        return sender;
    }

    private static MailSettings.Mode parseMode(String mode) {
        String value = mode == null ? "" : mode.trim().toLowerCase(Locale.ROOT);
        return switch (value) {
            case "", "mailpit" -> MailSettings.Mode.MAILPIT;
            case "smtp" -> MailSettings.Mode.SMTP;
            default -> throw new IllegalStateException("MAIL_MODE must be \"mailpit\" or \"smtp\", not \"" + mode + "\".");
        };
    }

    private static String fromOrDefault(String from, String fallback) {
        return from == null || from.isBlank() ? fallback : from.trim();
    }
}
