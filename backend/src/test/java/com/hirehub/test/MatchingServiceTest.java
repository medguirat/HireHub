package com.hirehub.test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hirehub.dto.MatchResponseDto;
import com.hirehub.entity.*;
import com.hirehub.exception.ApiException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.matching.*;
import com.hirehub.repository.CandidateCvRepository;
import com.hirehub.repository.JobOfferRepository;
import com.hirehub.repository.MatchScoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MatchingServiceTest {

    @Mock private JobOfferRepository jobOfferRepository;
    @Mock private CandidateCvRepository cvRepository;
    @Mock private MatchScoreRepository matchScoreRepository;
    @Mock private CvStorage storage;
    @Mock private AiServiceClient aiService;
    @Mock private AiServiceHealthMonitor health;

    private final ObjectMapper mapper = new ObjectMapper();
    private MatchingService service;

    private final User candidate = User.builder().id(1L).role(Role.CANDIDATE).build();
    private JobOffer offer;
    private CandidateCv cv;

    @BeforeEach
    void setUp() {
        CandidateCvService cvService = new CandidateCvService(cvRepository, matchScoreRepository, storage, aiService);
        service = new MatchingService(jobOfferRepository, cvRepository, matchScoreRepository, cvService,
                aiService, health, mapper);
        offer = JobOffer.builder().id(10L).title("Java Developer").description("Java and Spring Boot").build();
        cv = CandidateCv.builder().id(5L).candidate(candidate).originalFileName("cv.pdf").storedFileName("x.pdf")
                .sha256("cv-v1").extractedText("Java developer, 5 years").uploadedAt(LocalDateTime.now()).build();
        lenient().when(jobOfferRepository.findById(10L)).thenReturn(Optional.of(offer));
        lenient().when(cvRepository.findByCandidateId(1L)).thenReturn(Optional.of(cv));
        lenient().when(matchScoreRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private JsonNode aiResult(int score, String version) throws Exception {
        return mapper.readTree("{\"algorithm_version\":\"" + version + "\",\"overall_score\":" + score + "}");
    }

    private MatchScore cachedScore(String cvSha, String fingerprint, String version) {
        return MatchScore.builder().id(3L).candidate(candidate).jobOffer(offer).cvSha256(cvSha)
                .offerFingerprint(fingerprint).algorithmVersion(version).overallScore(80)
                .resultJson("{\"overall_score\":80}").computedAt(LocalDateTime.now().minusDays(1)).build();
    }

    @Test
    void computesAndStoresWhenNothingIsCached() throws Exception {
        when(matchScoreRepository.findByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(Optional.empty());
        when(aiService.match("Java developer, 5 years", "Java Developer", "Java and Spring Boot"))
                .thenReturn(aiResult(72, "v1"));

        MatchResponseDto dto = service.match(candidate, 10L);

        assertThat(dto.cached()).isFalse();
        assertThat(dto.result().path("overall_score").asInt()).isEqualTo(72);
        verify(matchScoreRepository).save(argThat(s -> s.getOverallScore() == 72 && s.getCvSha256().equals("cv-v1")
                && s.getAlgorithmVersion().equals("v1")));
    }

    @Test
    void returnsTheCachedResultWithoutCallingTheAiService() throws Exception {
        when(matchScoreRepository.findByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(Optional.empty());
        when(aiService.match(any(), any(), any())).thenReturn(aiResult(72, "v1"));
        service.match(candidate, 10L);
        MatchScore stored = captureSaved();

        when(matchScoreRepository.findByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(Optional.of(stored));
        when(health.algorithmVersion()).thenReturn("v1");
        MatchResponseDto second = service.match(candidate, 10L);

        assertThat(second.cached()).isTrue();
        verify(aiService, times(1)).match(any(), any(), any());
    }

    @Test
    void recomputesWhenTheCvChanged() throws Exception {
        MatchScore stored = storeFirstResult();
        cv.setSha256("cv-v2");
        when(matchScoreRepository.findByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(Optional.of(stored));

        assertThat(service.match(candidate, 10L).cached()).isFalse();
        verify(aiService, times(2)).match(any(), any(), any());
    }

    @Test
    void recomputesWhenTheOfferTextChanged() throws Exception {
        MatchScore stored = storeFirstResult();
        offer.setDescription("Java, Spring Boot and Kubernetes");
        when(matchScoreRepository.findByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(Optional.of(stored));

        assertThat(service.match(candidate, 10L).cached()).isFalse();
        verify(aiService, times(2)).match(any(), any(), any());
    }

    @Test
    void recomputesWhenTheScoringAlgorithmChanged() throws Exception {
        MatchScore stored = storeFirstResult();
        when(matchScoreRepository.findByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(Optional.of(stored));
        when(health.algorithmVersion()).thenReturn("v2");

        assertThat(service.match(candidate, 10L).cached()).isFalse();
        verify(aiService, times(2)).match(any(), any(), any());
    }

    @Test
    void aValidCachedResultIsServedEvenIfTheAiServiceIsDown() throws Exception {
        MatchScore stored = storeFirstResult();
        when(matchScoreRepository.findByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(Optional.of(stored));
        when(health.algorithmVersion()).thenReturn(null); // never seen healthy since restart

        assertThat(service.match(candidate, 10L).cached()).isTrue();
        verify(aiService, times(1)).match(any(), any(), any());
    }

    @Test
    void noScoreAtAllWhenTheAiServiceIsDownAndNothingIsCached() {
        when(matchScoreRepository.findByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(Optional.empty());
        when(aiService.match(any(), any(), any())).thenThrow(new AiServiceUnavailableException("down", null));

        ApiException error = assertThrows(ApiException.class, () -> service.match(candidate, 10L));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(error.getCode()).isEqualTo("MATCHING_UNAVAILABLE");
        verify(matchScoreRepository, never()).save(any());
    }

    @Test
    void requiresAnUploadedCv() {
        when(cvRepository.findByCandidateId(1L)).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class, () -> service.match(candidate, 10L));

        assertThat(error.getCode()).isEqualTo("CV_REQUIRED");
        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void extractsTheTextFirstIfTheAiServiceWasDownAtUpload() throws Exception {
        cv.setExtractedText(null);
        when(matchScoreRepository.findByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(Optional.empty());
        when(storage.read("x.pdf")).thenReturn(new byte[]{1, 2});
        when(aiService.extractText(any(), eq("cv.pdf"))).thenReturn(new AiServiceClient.ExtractedText("Java dev", "pdf"));
        when(aiService.match(eq("Java dev"), any(), any())).thenReturn(aiResult(60, "v1"));

        assertThat(service.match(candidate, 10L).result().path("overall_score").asInt()).isEqualTo(60);
        assertThat(cv.getExtractedText()).isEqualTo("Java dev");
    }

    @Test
    void unknownOffer() {
        when(jobOfferRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.match(candidate, 99L));
    }

    private MatchScore storeFirstResult() throws Exception {
        when(matchScoreRepository.findByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(Optional.empty());
        when(aiService.match(any(), any(), any())).thenReturn(aiResult(72, "v1"));
        service.match(candidate, 10L);
        return captureSaved();
    }

    private MatchScore captureSaved() {
        var captor = org.mockito.ArgumentCaptor.forClass(MatchScore.class);
        verify(matchScoreRepository, atLeastOnce()).save(captor.capture());
        return captor.getValue();
    }
}
