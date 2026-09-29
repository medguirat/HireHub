package com.hirehub.matching;

import com.hirehub.dto.CvMetadataDto;
import com.hirehub.entity.CandidateCv;
import com.hirehub.entity.User;
import com.hirehub.exception.ApiException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.CandidateCvRepository;
import com.hirehub.repository.MatchScoreRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class CandidateCvService {

    private static final Logger log = LoggerFactory.getLogger(CandidateCvService.class);

    private final CandidateCvRepository cvRepository;
    private final MatchScoreRepository matchScoreRepository;
    private final CvStorage storage;
    private final AiServiceClient aiService;

    public CandidateCvService(CandidateCvRepository cvRepository, MatchScoreRepository matchScoreRepository,
                              CvStorage storage, AiServiceClient aiService) {
        this.cvRepository = cvRepository;
        this.matchScoreRepository = matchScoreRepository;
        this.storage = storage;
        this.aiService = aiService;
    }

    public CvMetadataDto getMyCv(User candidate) {
        return cvRepository.findByCandidateId(candidate.getId())
                .map(CandidateCvService::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("You haven't uploaded a CV yet."));
    }

    public record CvFile(byte[] data, String fileName) {
        public boolean isPdf() {
            return fileName.toLowerCase(Locale.ROOT).endsWith(".pdf");
        }
    }

    /** The candidate's own stored CV file, for the preview on their profile. */
    public CvFile readMyCvFile(User candidate) {
        CandidateCv cv = cvRepository.findByCandidateId(candidate.getId())
                .orElseThrow(() -> new ResourceNotFoundException("You haven't uploaded a CV yet."));
        return new CvFile(storage.read(cv.getStoredFileName()), cv.getOriginalFileName());
    }

    /**
     * Stores the candidate's CV, replacing the previous one. The text is
     * extracted immediately; if the ai-service is down the file is kept and the
     * text is extracted on the first match instead. A file that is not a
     * readable CV is rejected and nothing is stored.
     */
    public CvMetadataDto uploadMyCv(User candidate, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.cvUnreadable("Please choose a file before submitting.");
        }
        String originalName = file.getOriginalFilename() == null ? "cv" : file.getOriginalFilename();
        String extension = extensionOf(originalName);
        if (!extension.equals(".pdf") && !extension.equals(".docx")) {
            throw ApiException.cvUnsupported("Please upload your CV as a PDF or DOCX file.");
        }
        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }

        String text = null;
        try {
            text = aiService.extractText(data, originalName).text();
        } catch (AiServiceUnavailableException e) {
            log.warn("CV stored without text for candidate {}: {}", candidate.getId(), e.getMessage());
        }

        String sha256 = sha256(data);
        CandidateCv cv = cvRepository.findByCandidateId(candidate.getId()).orElse(null);
        String previousFile = cv == null ? null : cv.getStoredFileName();
        boolean changed = cv == null || !cv.getSha256().equals(sha256);
        if (cv == null) {
            cv = CandidateCv.builder().candidate(candidate).build();
        }
        cv.setOriginalFileName(originalName);
        cv.setStoredFileName(storage.save(data, extension));
        cv.setContentType(file.getContentType());
        cv.setSizeBytes(data.length);
        cv.setSha256(sha256);
        cv.setExtractedText(text);
        cv.setUploadedAt(LocalDateTime.now());
        CandidateCv saved = cvRepository.save(cv);

        if (previousFile != null) {
            storage.delete(previousFile);
        }
        if (changed) {
            // Cached scores were computed on the previous CV; they would be skipped anyway.
            matchScoreRepository.deleteByCandidateId(candidate.getId());
        }
        return toDto(saved);
    }

    /** The CV's text, extracting it now if that couldn't be done at upload time. */
    String ensureText(CandidateCv cv) {
        if (cv.getExtractedText() == null) {
            byte[] data = storage.read(cv.getStoredFileName());
            cv.setExtractedText(aiService.extractText(data, cv.getOriginalFileName()).text());
            cvRepository.save(cv);
        }
        return cv.getExtractedText();
    }

    static String sha256(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String extensionOf(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? "" : fileName.substring(dot).toLowerCase(Locale.ROOT);
    }

    private static CvMetadataDto toDto(CandidateCv cv) {
        return new CvMetadataDto(cv.getOriginalFileName(), cv.getSizeBytes(), cv.getUploadedAt(),
                cv.getExtractedText() != null);
    }
}
