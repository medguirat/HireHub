package com.hirehub.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String from;

    public EmailService(JavaMailSender mailSender,
                        @Value("${app.mail.from:HireHub <no-reply@hirehub.local>}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    public void sendWelcomeEmail(String toEmail, String firstName, String role) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Bienvenue sur HireHub !");

            String roleText = "CANDIDATE".equalsIgnoreCase(role) ? "Candidat" : "Recruteur";

            String text = String.format(
                "Bonjour %s,\n\n" +
                "Bienvenue sur HireHub ! Votre compte a été créé avec succès en tant que %s.\n" +
                "Vous pouvez dès à présent vous connecter et compléter votre profil.\n\n" +
                "Cordialement,\n" +
                "L'équipe HireHub",
                firstName, roleText
            );

            message.setText(text);
            message.setFrom(from);

            mailSender.send(message);
            log.info("Email de bienvenue envoyé avec succès à : {}", toEmail);
        } catch (Exception e) {
            log.warn("Impossible d'envoyer l'email de bienvenue à {} : {}", toEmail, e.getMessage());
        }
    }

    /** The "reset your password" email. The link is never logged: it is the secret. */
    public void sendPasswordResetEmail(String toEmail, String firstName, String link, int validityMinutes) {
        String text = """
                Hello %s,

                Someone (hopefully you) asked to reset the password of your HireHub account.
                To choose a new password, open this link:

                %s

                The link works once and expires in %d minutes.
                If you didn't ask for this, ignore this email: your password stays the same.

                The HireHub team
                """.formatted(firstName, link, validityMinutes);
        String safeLink = HtmlUtils.htmlEscape(link);
        String html = """
                <p>Hello %s,</p>
                <p>Someone (hopefully you) asked to reset the password of your HireHub account.</p>
                <p><a href="%s">Choose a new password</a></p>
                <p>The link works once and expires in %d minutes.<br>
                If you didn't ask for this, ignore this email: your password stays the same.</p>
                <p>The HireHub team</p>
                """.formatted(HtmlUtils.htmlEscape(firstName), safeLink, validityMinutes);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(toEmail);
            helper.setSubject("Reset your HireHub password");
            helper.setText(text, html);
            mailSender.send(message);
            log.info("Password reset email sent to {}", toEmail);
        } catch (MessagingException | RuntimeException e) {
            log.warn("Could not send the password reset email to {}: {}", toEmail, e.getMessage());
        }
    }
}
