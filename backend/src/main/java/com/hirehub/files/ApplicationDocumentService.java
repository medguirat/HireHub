package com.hirehub.files;

import com.hirehub.dto.StoredFileDto;
import com.hirehub.entity.StoredFile;
import com.hirehub.entity.User;
import com.hirehub.exception.ApiException;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ErrorCodes;
import com.hirehub.exception.ForbiddenException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.matching.CvStorage;
import com.hirehub.repository.StoredFileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.NoSuchFileException;
import java.time.LocalDateTime;
import java.util.UUID;

/** The PDFs candidates attach to applications (CV, cover letter): stored privately, served only after a check. */
@Service
public class ApplicationDocumentService {

    public static final String FILE_NOT_FOUND = "FILE_NOT_FOUND";

    private final StoredFileRepository repository;
    private final CvStorage storage;

    public ApplicationDocumentService(StoredFileRepository repository, CvStorage storage) {
        this.repository = repository;
        this.storage = storage;
    }

    public StoredFileDto upload(User candidate, MultipartFile file) {
        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file", e);
        }
        if (data.length == 0) {
            throw new BadRequestException(ErrorCodes.FILE_MISSING, "The file is empty. Please choose another file.");
        }
        if (!FileTypes.isPdf(data)) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, ErrorCodes.UNSUPPORTED_MEDIA_TYPE,
                    "Please upload a PDF file.");
        }
        StoredFile stored = store(candidate, data, FileTypes.cleanName(file.getOriginalFilename(), "document.pdf"));
        return new StoredFileDto(stored.getId(), stored.getOriginalName(), stored.getSizeBytes());
    }

    /** Saves a PDF for its owner (also used to move old public uploads into private storage). */
    public StoredFile store(User owner, byte[] data, String name) {
        return repository.save(StoredFile.builder()
                .id(UUID.randomUUID().toString())
                .owner(owner)
                .originalName(name)
                .storedName(storage.save(data, ".pdf"))
                .contentType("application/pdf")
                .sizeBytes(data.length)
                .createdAt(LocalDateTime.now())
                .build());
    }

    /** A file the candidate may attach to an application: it must exist and be theirs. */
    public StoredFile attachable(String id, User candidate) {
        StoredFile file = repository.findById(id).orElseThrow(() ->
                new BadRequestException(FILE_NOT_FOUND, "This file wasn't found. Please upload it again."));
        if (!file.getOwner().getId().equals(candidate.getId())) {
            throw new ForbiddenException("You can only attach files you uploaded yourself.");
        }
        return file;
    }

    public byte[] read(StoredFile file) {
        try {
            return storage.read(file.getStoredName());
        } catch (UncheckedIOException e) {
            if (e.getCause() instanceof NoSuchFileException) {
                throw new ResourceNotFoundException("This file is no longer available.");
            }
            throw e;
        }
    }
}
