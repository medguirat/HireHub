package com.hirehub.matching;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Stores candidates' matching CVs on disk. Deliberately NOT under /uploads,
 * which Spring serves publicly: a CV is only readable through the backend.
 */
@Component
public class CvStorage {

    private final Path root;

    public CvStorage(@Value("${app.cv-storage-dir:cv-store}") String directory) {
        this.root = Paths.get(directory).toAbsolutePath().normalize();
    }

    public String save(byte[] data, String extension) {
        String name = UUID.randomUUID() + extension;
        try {
            Files.createDirectories(root);
            Files.write(root.resolve(name), data);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not store CV", e);
        }
        return name;
    }

    public byte[] read(String storedName) {
        try {
            return Files.readAllBytes(resolve(storedName));
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read stored CV " + storedName, e);
        }
    }

    public void delete(String storedName) {
        try {
            Files.deleteIfExists(resolve(storedName));
        } catch (IOException e) {
            throw new UncheckedIOException("Could not delete stored CV " + storedName, e);
        }
    }

    private Path resolve(String storedName) {
        Path path = root.resolve(storedName).normalize();
        if (!path.startsWith(root)) {
            throw new IllegalArgumentException("Invalid CV file name");
        }
        return path;
    }
}
