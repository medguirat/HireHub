package com.hirehub.mail;

/** One email, ready to send: the same content as plain text and as HTML. */
public record EmailContent(String subject, String text, String html) {
}
