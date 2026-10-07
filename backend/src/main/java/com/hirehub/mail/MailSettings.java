package com.hirehub.mail;

/** The resolved email settings (see {@link MailConfig}). The password is never logged or returned. */
public record MailSettings(Mode mode, String host, int port, String username, String password, String from) {

    public static final String DEFAULT_FROM = "HireHub <no-reply@hirehub.local>";

    public enum Mode { MAILPIT, SMTP }

    @Override
    public String toString() {
        return "MailSettings[mode=" + mode + ", host=" + host + ", port=" + port + ", from=" + from + "]";
    }
}
