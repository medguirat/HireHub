package com.hirehub.test;

import com.hirehub.service.EmailService;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;

import java.io.ByteArrayOutputStream;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PasswordResetEmailTest {

    @Test
    void theEmailHasTheLinkTheExpiryAndATextAndHtmlVersion() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        EmailService service = new EmailService(sender, "HireHub <no-reply@hirehub.local>");

        String link = "http://localhost:5173/reset-password#token=abc_DEF-123";
        service.sendPasswordResetEmail("rita@test.com", "Rita <b>", link, 45);

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(sent.capture());
        MimeMessage message = sent.getValue();
        assertThat(message.getSubject()).isEqualTo("Reset your HireHub password");
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo("rita@test.com");
        assertThat(message.getFrom()[0].toString()).contains("no-reply@hirehub.local");
        assertThat(message.getContent()).isInstanceOf(MimeMultipart.class);

        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        message.writeTo(raw);
        String body = raw.toString();
        assertThat(body).contains(link).contains("expires in 45 minutes").contains("text/plain").contains("text/html");
        assertThat(body).contains("Rita &lt;b&gt;"); // names are escaped in the HTML version
    }
}
