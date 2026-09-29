package com.hirehub.matching;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hirehub.dto.MatchResponseDto;
import com.hirehub.entity.CandidateCv;
import com.hirehub.entity.JobOffer;
import com.hirehub.entity.MatchScore;
import com.hirehub.entity.User;
import com.hirehub.exception.ApiException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.CandidateCvRepository;
import com.hirehub.repository.JobOfferRepository;
import com.hirehub.repository.MatchScoreRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/**
 * Scores the candidate's current CV against an offer via the ai-service, with
 * a cache per (CV version, offer content, algorithm version). There is no
 * fallback score: if the ai-service is unavailable and nothing valid is
 * cached, the caller gets a 503.
 */
@Service
public class MatchingService {

    private final JobOfferRepository jobOfferRepository;
    private final CandidateCvRepository cvRepository;
    private final MatchScoreRepository matchScoreRepository;
    private final CandidateCvService cvService;
    private final AiServiceClient aiService;
    private final AiServiceHealthMonitor aiServiceHealth;
    private final ObjectMapper objectMapper;

    public MatchingService(JobOfferRepository jobOfferRepository, CandidateCvRepository cvRepository,
                           MatchScoreRepository matchScoreRepository, CandidateCvService cvService,
                           AiServiceClient aiService, AiServiceHealthMonitor aiServiceHealth,
                           ObjectMapper objectMapper) {
        this.jobOfferRepository = jobOfferRepository;
        this.cvRepository = cvRepository;
        this.matchScoreRepository = matchScoreRepository;
        this.cvService = cvService;
        this.aiService = aiService;
        this.aiServiceHealth = aiServiceHealth;
        this.objectMapper = objectMapper;
    }

    public MatchResponseDto match(User candidate, Long offerId) {
        JobOffer offer = jobOfferRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Job offer not found."));
        CandidateCv cv = cvRepository.findByCandidateId(candidate.getId())
                .orElseThrow(ApiException::cvRequired);
        String fingerprint = offerFingerprint(offer);

        MatchScore cached = matchScoreRepository.findByCandidateIdAndJobOfferId(candidate.getId(), offerId)
                .orElse(null);
        if (cached != null && isStillValid(cached, cv, fingerprint)) {
            return toDto(offer, cv, cached, true);
        }

        JsonNode result;
        try {
            result = aiService.match(cvService.ensureText(cv), offer.getTitle(), offer.getDescription());
        } catch (AiServiceUnavailableException e) {
            throw ApiException.matchingUnavailable();
        }

        MatchScore score = cached != null ? cached : MatchScore.builder().candidate(candidate).jobOffer(offer).build();
        score.setCvSha256(cv.getSha256());
        score.setOfferFingerprint(fingerprint);
        score.setAlgorithmVersion(result.path("algorithm_version").asText("unknown"));
        score.setOverallScore(result.path("overall_score").asInt());
        score.setResultJson(result.toString());
        score.setComputedAt(LocalDateTime.now());
        try {
            score = matchScoreRepository.save(score);
        } catch (DataIntegrityViolationException raced) {
            // Two requests for the same pair computed at once; the other one's row is just as valid.
        }
        return toDto(offer, cv, score, false);
    }

    private boolean isStillValid(MatchScore cached, CandidateCv cv, String fingerprint) {
        String currentAlgorithm = aiServiceHealth.algorithmVersion();
        return cached.getCvSha256().equals(cv.getSha256())
                && cached.getOfferFingerprint().equals(fingerprint)
                && (currentAlgorithm == null || currentAlgorithm.equals(cached.getAlgorithmVersion()));
    }

    /** Only the text the score is computed from; location or deadline changes don't invalidate it. */
    static String offerFingerprint(JobOffer offer) {
        String content = offer.getTitle() + "\n" + (offer.getDescription() == null ? "" : offer.getDescription());
        return CandidateCvService.sha256(content.getBytes(StandardCharsets.UTF_8));
    }

    private MatchResponseDto toDto(JobOffer offer, CandidateCv cv, MatchScore score, boolean cached) {
        try {
            return new MatchResponseDto(offer.getId(), offer.getTitle(), cv.getOriginalFileName(), cached,
                    score.getComputedAt(), objectMapper.readTree(score.getResultJson()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Corrupt cached match result " + score.getId(), e);
        }
    }
}
