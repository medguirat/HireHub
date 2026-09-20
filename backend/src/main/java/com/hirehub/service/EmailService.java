package com.hirehub.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    
    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
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
            message.setFrom("noreply@hirehub.com");
            
            mailSender.send(message);
            log.info("Email de bienvenue envoyé avec succès à : {}", toEmail);
        } catch (Exception e) {
            log.warn("Impossible d'envoyer l'email de bienvenue à {} : {}", toEmail, e.getMessage());
        }
    }
}
