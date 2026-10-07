package com.hirehub.mail;

import org.springframework.web.util.HtmlUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * HireHub's email layout. Every email has a plain-text and an HTML version built from the same
 * content, so they never say different things.
 * <p>
 * The HTML follows what email clients support: a centered 600px table, inline styles only,
 * web-safe fonts, no images (the wordmark is text, so nothing is blocked or missing). Colors come
 * from the app's design tokens (frontend/src/styles/tokens.css). All text is escaped.
 */
public final class EmailLayout {

    private static final String NAVY = "#132B64";
    private static final String MAGENTA = "#E81B6B";
    private static final String INK = "#111827";
    private static final String TEXT = "#374151";
    private static final String MUTED = "#667085";
    private static final String PAGE = "#F4F6FB";
    private static final String LINE = "#E5E7EB";
    private static final String FONT = "'Segoe UI', Helvetica, Arial, sans-serif";

    private final String subject;
    private String preheader = "";
    private String greeting = "";
    private final List<String> paragraphs = new ArrayList<>();
    private String buttonLabel;
    private String buttonUrl;
    private final List<String> notes = new ArrayList<>();
    private String footer = "";

    private EmailLayout(String subject) {
        this.subject = subject;
    }

    public static EmailLayout email(String subject) {
        return new EmailLayout(subject);
    }

    /** The preview line inbox lists show next to the subject. */
    public EmailLayout preheader(String text) {
        this.preheader = text;
        return this;
    }

    public EmailLayout greeting(String text) {
        this.greeting = text;
        return this;
    }

    public EmailLayout paragraph(String text) {
        paragraphs.add(text);
        return this;
    }

    /** The main action. The plain-text version shows the address on its own line. */
    public EmailLayout button(String label, String url) {
        this.buttonLabel = label;
        this.buttonUrl = url;
        return this;
    }

    /** Smaller text after the button (expiry, "if you didn't ask for this"...). */
    public EmailLayout note(String text) {
        notes.add(text);
        return this;
    }

    /** Why the person received this email. */
    public EmailLayout footer(String text) {
        this.footer = text;
        return this;
    }

    public EmailContent render() {
        return new EmailContent(subject, text(), html());
    }

    private String text() {
        StringBuilder out = new StringBuilder();
        out.append(greeting).append("\n\n");
        for (String p : paragraphs) {
            out.append(p).append("\n\n");
        }
        if (buttonUrl != null) {
            out.append(buttonLabel).append(":\n").append(buttonUrl).append("\n\n");
        }
        for (String n : notes) {
            out.append(n).append("\n\n");
        }
        out.append("The HireHub team\n");
        if (!footer.isEmpty()) {
            out.append("\n--\n").append(footer).append("\n");
        }
        return out.toString();
    }

    private String html() {
        StringBuilder body = new StringBuilder();
        body.append(p(greeting, INK, 16, "0 0 16px", "600"));
        for (String para : paragraphs) {
            body.append(p(para, TEXT, 15, "0 0 16px", "400"));
        }
        if (buttonUrl != null) {
            String url = esc(buttonUrl);
            body.append("""
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px">
                      <tr><td style="border-radius:10px;background:%s">
                        <a href="%s" style="display:inline-block;padding:13px 26px;font-family:%s;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">%s</a>
                      </td></tr>
                    </table>
                    """.formatted(MAGENTA, url, FONT, esc(buttonLabel)));
            body.append(p("If the button doesn't work, copy this address into your browser:", MUTED, 13, "0 0 4px", "400"));
            body.append("<p style=\"margin:0 0 20px;font-family:%s;font-size:13px;line-height:1.5;word-break:break-all\"><a href=\"%s\" style=\"color:%s\">%s</a></p>\n"
                    .formatted(FONT, url, NAVY, url));
        }
        for (String n : notes) {
            body.append(p(n, MUTED, 13, "0 0 12px", "400"));
        }
        body.append(p("The HireHub team", TEXT, 15, "20px 0 0", "600"));

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <meta name="color-scheme" content="light">
                <title>%s</title>
                </head>
                <body style="margin:0;padding:0;background:%s">
                <div style="display:none;max-height:0;overflow:hidden;opacity:0">%s</div>
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background:%s">
                  <tr><td align="center" style="padding:32px 16px">
                    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
                      <tr><td style="background:%s;border-radius:16px 16px 0 0;padding:22px 32px">
                        <span style="font-family:%s;font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#ffffff">Hire<span style="color:%s">Hub</span></span>
                      </td></tr>
                      <tr><td style="background:#ffffff;border:1px solid %s;border-top:0;border-radius:0 0 16px 16px;padding:32px">
                %s
                      </td></tr>
                      <tr><td style="padding:20px 32px 0;font-family:%s;font-size:12px;line-height:1.5;color:%s;text-align:center">%s</td></tr>
                    </table>
                  </td></tr>
                </table>
                </body>
                </html>
                """.formatted(esc(subject), PAGE, esc(preheader), PAGE, NAVY, FONT, MAGENTA, LINE,
                body, FONT, MUTED, esc(footer));
    }

    private static String p(String text, String color, int size, String margin, String weight) {
        return "<p style=\"margin:%s;font-family:%s;font-size:%dpx;line-height:1.6;font-weight:%s;color:%s\">%s</p>\n"
                .formatted(margin, FONT, size, weight, color, esc(text));
    }

    private static String esc(String text) {
        return HtmlUtils.htmlEscape(text == null ? "" : text);
    }
}
