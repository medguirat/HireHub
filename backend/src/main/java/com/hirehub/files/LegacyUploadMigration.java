package com.hirehub.files;

import com.hirehub.entity.Application;
import com.hirehub.entity.StoredFile;
import com.hirehub.entity.User;
import com.hirehub.repository.ApplicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;

/**
 * Applications made before CVs were stored privately point to a public link such as
 * http://localhost:8081/uploads/123_abc.pdf. At startup, each such file that still exists is
 * copied into private storage and linked to its application, so it keeps working through the
 * protected endpoints. /uploads no longer serves PDFs, so the old links stop working either way.
 * Idempotent: an application that already has its private file is skipped. The old public copies
 * are left on disk (never served); they can be deleted by hand.
 */
@Component
public class LegacyUploadMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LegacyUploadMigration.class);
    private static final String MARKER = "/uploads/";

    private final ApplicationRepository applications;
    private final ApplicationDocumentService documents;
    private final TransactionTemplate transaction;
    private final Path uploadDir;

    public LegacyUploadMigration(ApplicationRepository applications, ApplicationDocumentService documents,
                                 TransactionTemplate transaction,
                                 @Value("${app.public-upload-dir:uploads}") String uploadDir) {
        this.applications = applications;
        this.documents = documents;
        this.transaction = transaction;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Override
    public void run(ApplicationArguments args) {
        migrate();
    }

    /** Returns how many files were moved into private storage. */
    public int migrate() {
        int[] counts = new int[2]; // moved, missing
        for (Long id : transaction.execute(status -> applications.findIdsWithOldUploadLinks(MARKER))) {
            transaction.executeWithoutResult(status -> {
                Application app = applications.findById(id).orElseThrow();
                User candidate = app.getCandidate();
                String person = (candidate.getFirstName() + "-" + candidate.getLastName()).replaceAll("\\s+", "-");
                if (app.getCvFile() == null && isOldLink(app.getCv())) {
                    Optional<StoredFile> file = moveToPrivate(app.getCv(), candidate, "CV-" + person + ".pdf");
                    file.ifPresent(f -> {
                        app.setCvFile(f);
                        app.setCv(f.getOriginalName());
                    });
                    counts[file.isPresent() ? 0 : 1]++;
                }
                if (app.getCoverLetterFile() == null && isOldLink(app.getCoverLetter())) {
                    Optional<StoredFile> file = moveToPrivate(app.getCoverLetter(), candidate, "Cover-letter-" + person + ".pdf");
                    file.ifPresent(f -> {
                        app.setCoverLetterFile(f);
                        app.setCoverLetter(null);
                    });
                    counts[file.isPresent() ? 0 : 1]++;
                }
            });
        }
        if (counts[0] > 0 || counts[1] > 0) {
            log.info("Private files: moved {} application file(s) from the public uploads folder into private storage; "
                    + "{} old link(s) point to files that no longer exist and were left as they are.", counts[0], counts[1]);
        }
        return counts[0];
    }

    private static boolean isOldLink(String value) {
        return value != null && value.startsWith("http") && value.contains(MARKER);
    }

    private Optional<StoredFile> moveToPrivate(String link, User owner, String name) {
        Path file = uploadDir.resolve(link.substring(link.lastIndexOf(MARKER) + MARKER.length())).normalize();
        if (!file.startsWith(uploadDir) || !Files.isRegularFile(file)) {
            return Optional.empty();
        }
        try {
            byte[] data = Files.readAllBytes(file);
            return FileTypes.isPdf(data) ? Optional.of(documents.store(owner, data, name)) : Optional.empty();
        } catch (IOException e) {
            log.warn("Could not read old upload {}: {}", file.getFileName(), e.getMessage());
            return Optional.empty();
        }
    }
}
