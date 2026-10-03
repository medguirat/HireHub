package com.hirehub.test;

import com.hirehub.entity.Role;
import com.hirehub.mail.EmailContent;
import com.hirehub.mail.MailSettings;
import com.hirehub.service.EmailService;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.Executor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailServiceTest {

    private static final String LINK = "http://localhost:5173/reset-password#token=abc_DEF-123";

    private final JavaMailSender sender = mock(JavaMailSender.class);
    /** Runs the "background" tasks on demand, so a test can check nothing was sent too early. */
    private final List<Runnable> background = new ArrayList<>();
    private final Executor executor = background::add;
    private final EmailService service = new EmailService(sender,
            new MailSettings(MailSettings.Mode.MAILPIT, "localhost", 1025, "", "", "HireHub <no-reply@hirehub.local>"),
            executor, "http://localhost:5173/");

    EmailServiceTest() {
        when(sender.createMimeMessage()).thenAnswer(i -> new MimeMessage(Session.getInstance(new Properties())));
    }

    @AfterEach
    void endTransaction() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    private MimeMessage sentMessage() {
        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(sent.capture());
        return sent.getValue();
    }

    private static String raw(MimeMessage message) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        message.writeTo(out);
        return out.toString();
    }

    private void runBackground() {
        new ArrayList<>(background).forEach(Runnable::run);
        background.clear();
    }

    @Test
    void thePasswordResetEmailHasTheLinkTheExpiryAndATextAndHtmlVersion() throws Exception {
        service.sendPasswordResetEmail("rita@test.com", "Rita <b>", LINK, 45);
        runBackground();

        MimeMessage message = sentMessage();
        assertThat(message.getSubject()).isEqualTo("Reset your HireHub password");
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo("rita@test.com");
        assertThat(message.getFrom()[0].toString()).contains("no-reply@hirehub.local");
        assertThat(message.getContent()).isInstanceOf(MimeMultipart.class);
        String body = raw(message);
        assertThat(body).contains("text/plain").contains("text/html").contains("expires in 45 minutes");
        assertThat(body).contains("Rita &lt;b&gt;"); // names are escaped in the HTML version
    }

    @Test
    void bothVersionsSayTheSameThingAndTheButtonHasAPlainTextFallback() {
        EmailContent email = service.passwordResetEmail("Rita", LINK, 45);

        assertThat(email.text()).contains("Hello Rita,").contains(LINK).contains("expires in 45 minutes")
                .contains("If you didn't ask for this").doesNotContain("<");
        assertThat(email.html()).contains("Hello Rita,").contains("href=\"" + LINK + "\"")
                .contains("If the button doesn&#39;t work").contains("expires in 45 minutes")
                .contains("Hire<span").contains("#E81B6B"); // wordmark and brand color
    }

    @Test
    void theWelcomeEmailPointsEachRoleToItsDashboard() {
        EmailContent candidate = service.welcomeEmail("Ali", Role.CANDIDATE);
        assertThat(candidate.subject()).isEqualTo("Welcome to HireHub");
        assertThat(candidate.text()).contains("Hello Ali,").contains("candidate account is ready")
                .contains("http://localhost:5173/candidate-dashboard");

        EmailContent recruiter = service.welcomeEmail("Rec", Role.RECRUITER);
        assertThat(recruiter.text()).contains("recruiter account is ready")
                .contains("http://localhost:5173/recruiter-dashboard");
        assertThat(recruiter.html()).contains("href=\"http://localhost:5173/recruiter-dashboard\"");
    }

    @Test
    void anEmailIsSentInTheBackgroundNotOnTheCallersThread() throws Exception {
        service.sendWelcomeEmail("ali@test.com", "Ali", Role.CANDIDATE);
        verify(sender, never()).send(any(MimeMessage.class));

        runBackground();
        assertThat(sentMessage().getAllRecipients()).hasSize(1);
    }

    @Test
    void insideATransactionTheEmailWaitsForTheCommit() {
        TransactionSynchronizationManager.initSynchronization();
        service.sendWelcomeEmail("ali@test.com", "Ali", Role.CANDIDATE);
        runBackground();
        verify(sender, never()).send(any(MimeMessage.class));

        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        runBackground();
        verify(sender).send(any(MimeMessage.class));
    }

    @Test
    void aRolledBackTransactionSendsNothing() {
        TransactionSynchronizationManager.initSynchronization();
        service.sendWelcomeEmail("ali@test.com", "Ali", Role.CANDIDATE);
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
        runBackground();

        verify(sender, never()).send(any(MimeMessage.class));
    }

    @Test
    void aMailServerFailureIsLoggedAndNeverThrown() {
        doThrow(new MailSendException("535 Authentication failed")).when(sender).send(any(MimeMessage.class));

        service.sendPasswordResetEmail("rita@test.com", "Rita", LINK, 45);
        assertThatCode(this::runBackground).doesNotThrowAnyException();
    }

    @Test
    void aFullMailQueueDropsTheEmailWithoutFailingTheCaller() {
        EmailService saturated = new EmailService(sender,
                new MailSettings(MailSettings.Mode.MAILPIT, "localhost", 1025, "", "", MailSettings.DEFAULT_FROM),
                task -> { throw new java.util.concurrent.RejectedExecutionException("queue full"); },
                "http://localhost:5173");

        assertThatCode(() -> saturated.sendWelcomeEmail("ali@test.com", "Ali", Role.CANDIDATE)).doesNotThrowAnyException();
        verify(sender, never()).send(any(MimeMessage.class));
    }
}
