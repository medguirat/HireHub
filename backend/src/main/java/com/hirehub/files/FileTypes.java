package com.hirehub.files;

import java.util.Arrays;
import java.util.Optional;

/**
 * Recognises the few file types HireHub accepts from their first bytes (their "magic number"),
 * never from the name or the type the browser claims: a renamed file is still refused.
 */
public final class FileTypes {

    public enum Image {
        PNG("image/png", ".png"), JPEG("image/jpeg", ".jpg"), GIF("image/gif", ".gif"), WEBP("image/webp", ".webp");

        public final String contentType;
        public final String extension;

        Image(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }
    }

    /** The extensions the public /uploads folder serves; anything else there is never served. */
    public static final String[] PUBLIC_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"};

    private FileTypes() {
    }

    public static boolean isPdf(byte[] data) {
        return startsWith(data, 0, "%PDF-".getBytes());
    }

    public static Optional<Image> image(byte[] data) {
        if (startsWith(data, 0, new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})) return Optional.of(Image.PNG);
        if (startsWith(data, 0, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF})) return Optional.of(Image.JPEG);
        if (startsWith(data, 0, "GIF87a".getBytes()) || startsWith(data, 0, "GIF89a".getBytes())) return Optional.of(Image.GIF);
        if (startsWith(data, 0, "RIFF".getBytes()) && startsWith(data, 8, "WEBP".getBytes())) return Optional.of(Image.WEBP);
        return Optional.empty();
    }

    public static boolean isPublicPath(String path) {
        String lower = path.toLowerCase();
        return Arrays.stream(PUBLIC_EXTENSIONS).anyMatch(lower::endsWith);
    }

    /** Keeps only the file's own name (no folders), trimmed to a sensible length. */
    public static String cleanName(String name, String fallback) {
        if (name == null || name.isBlank()) return fallback;
        String base = name.replace('\\', '/');
        base = base.substring(base.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}\"]", "").trim();
        if (base.isEmpty()) return fallback;
        return base.length() > 150 ? base.substring(base.length() - 150) : base;
    }

    private static boolean startsWith(byte[] data, int offset, byte[] prefix) {
        if (data == null || data.length < offset + prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (data[offset + i] != prefix[i]) return false;
        }
        return true;
    }
}
