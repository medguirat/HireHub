package com.hirehub.test;

import com.hirehub.mail.MailConfig;
import com.hirehub.mail.MailSettings;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MailConfigTest {

    private final MailConfig config = new MailConfig();

    private MailSettings settings(String mode, String host, int port, String user, String password, String from) {
        return config.mailSettings(mode, "localhost", 1025, host, port, user, password, from);
    }

    @Test
    void mailpitIsTheDefaultAndIgnoresTheSmtpSettings() {
        MailSettings s = settings("", "smtp.gmail.com", 587, "me@gmail.com", "secret", "");
        assertThat(s.mode()).isEqualTo(MailSettings.Mode.MAILPIT);
        assertThat(s.host()).isEqualTo("localhost");
        assertThat(s.port()).isEqualTo(1025);
        assertThat(s.from()).isEqualTo(MailSettings.DEFAULT_FROM);

        JavaMailSenderImpl sender = (JavaMailSenderImpl) config.javaMailSender(s);
        assertThat(sender.getUsername()).isNull();
        assertThat(sender.getJavaMailProperties()).doesNotContainKey("mail.smtp.auth");
    }

    @Test
    void gmailUsesStartTlsLoginAndSendsAsTheAccount() {
        // Gmail shows app passwords in groups of four: the spaces are dropped.
        MailSettings s = settings("SMTP", "smtp.gmail.com", 587, "marwa.hirehub@gmail.com", "abcd efgh ijkl mnop", "");
        assertThat(s.mode()).isEqualTo(MailSettings.Mode.SMTP);
        assertThat(s.password()).isEqualTo("abcdefghijklmnop");
        assertThat(s.from()).isEqualTo("HireHub <marwa.hirehub@gmail.com>");
        assertThat(s.toString()).doesNotContain("abcd");

        JavaMailSenderImpl sender = (JavaMailSenderImpl) config.javaMailSender(s);
        assertThat(sender.getHost()).isEqualTo("smtp.gmail.com");
        assertThat(sender.getPort()).isEqualTo(587);
        assertThat(sender.getUsername()).isEqualTo("marwa.hirehub@gmail.com");
        assertThat(sender.getJavaMailProperties())
                .containsEntry("mail.smtp.auth", "true")
                .containsEntry("mail.smtp.starttls.enable", "true")
                .containsEntry("mail.smtp.starttls.required", "true");
    }

    @Test
    void port465UsesImplicitTlsAndAnExplicitSenderIsKept() {
        MailSettings s = settings("smtp", "smtp.example.com", 465, "user", "pw", "Recrutement <jobs@example.com>");
        assertThat(s.from()).isEqualTo("Recrutement <jobs@example.com>");
        JavaMailSenderImpl sender = (JavaMailSenderImpl) config.javaMailSender(s);
        assertThat(sender.getJavaMailProperties()).containsEntry("mail.smtp.ssl.enable", "true")
                .doesNotContainKey("mail.smtp.starttls.enable");
    }

    @Test
    void anIncompleteSmtpSettingStopsTheStartupWithTheMissingNames() {
        assertThatThrownBy(() -> settings("smtp", "smtp.gmail.com", 587, "", " ", ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SMTP_USERNAME, SMTP_PASSWORD")
                .hasMessageNotContaining("SMTP_HOST");
    }

    @Test
    void anUnknownModeIsRefused() {
        assertThatThrownBy(() -> settings("gmail", "", 587, "", "", ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("MAIL_MODE must be \"mailpit\" or \"smtp\"");
    }
}
