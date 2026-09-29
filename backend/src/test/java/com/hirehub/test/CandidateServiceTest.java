package com.hirehub.test;

import com.hirehub.service.CandidateService;

import com.hirehub.dto.CandidateDashboardDto;
import com.hirehub.dto.JobOfferWithStatusDto;
import com.hirehub.entity.*;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.ApplicationRepository;
import com.hirehub.repository.JobOfferRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateServiceTest {

    @Mock private JobOfferRepository jobOfferRepository;
    @Mock private ApplicationRepository applicationRepository;

    @InjectMocks private CandidateService candidateService;

    private User candidate(Long id) {
        return User.builder().id(id).firstName("Cand").lastName("Idate").role(Role.CANDIDATE).build();
    }

    private JobOffer offer(Long id, LocalDate deadline) {
        User recruiter = User.builder().id(99L).firstName("Ali").lastName("Ben").build();
        return JobOffer.builder().id(id).title("Dev Java").recruiter(recruiter).deadline(deadline).build();
    }

    @Test
    void browseOffers_marksAlreadyAppliedTrueWhenApplicationExists() {
        User candidate = candidate(1L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5));
        Pageable pageable = PageRequest.of(0, 10);
        Page<JobOffer> page = new PageImpl<>(List.of(offer));

        when(jobOfferRepository.searchActive(isNull(), isNull(), isNull(), any(LocalDate.class), eq(pageable))).thenReturn(page);
        when(applicationRepository.existsByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(true);

        Page<JobOfferWithStatusDto> result = candidateService.browseOffers(candidate, null, null, null, pageable);

        assertThat(result.getContent().get(0).isAlreadyApplied()).isTrue();
        assertThat(result.getContent().get(0).isExpired()).isFalse();
    }

    @Test
    void browseOffers_marksAlreadyAppliedFalseWhenNoApplication() {
        User candidate = candidate(1L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5));
        Pageable pageable = PageRequest.of(0, 10);
        Page<JobOffer> page = new PageImpl<>(List.of(offer));

        when(jobOfferRepository.searchActive(any(), any(), any(), any(LocalDate.class), eq(pageable))).thenReturn(page);
        when(applicationRepository.existsByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(false);

        Page<JobOfferWithStatusDto> result = candidateService.browseOffers(candidate, null, null, null, pageable);

        assertThat(result.getContent().get(0).isAlreadyApplied()).isFalse();
    }

    @Test
    void browseOffers_marksExpiredTrueWhenDeadlinePassed() {
        User candidate = candidate(1L);
        JobOffer offer = offer(10L, LocalDate.now().minusDays(1));
        Pageable pageable = PageRequest.of(0, 10);
        Page<JobOffer> page = new PageImpl<>(List.of(offer));

        when(jobOfferRepository.searchActive(any(), any(), any(), any(LocalDate.class), eq(pageable))).thenReturn(page);
        when(applicationRepository.existsByCandidateIdAndJobOfferId(anyLong(), anyLong())).thenReturn(false);

        Page<JobOfferWithStatusDto> result = candidateService.browseOffers(candidate, null, null, null, pageable);

        assertThat(result.getContent().get(0).isExpired()).isTrue();
    }

    @Test
    void browseOffers_passesBlankKeywordAsNullToRepository() {
        User candidate = candidate(1L);
        Pageable pageable = PageRequest.of(0, 10);

        when(jobOfferRepository.searchActive(isNull(), isNull(), isNull(), any(LocalDate.class), eq(pageable)))
                .thenReturn(Page.empty(pageable));

        candidateService.browseOffers(candidate, "  ", "", null, pageable);

        verify(jobOfferRepository).searchActive(isNull(), isNull(), isNull(), any(LocalDate.class), eq(pageable));
    }

    @Test
    void browseOffers_passesActualFiltersToRepository() {
        User candidate = candidate(1L);
        Pageable pageable = PageRequest.of(0, 10);

        when(jobOfferRepository.searchActive(eq("java"), eq("sfax"), eq(ContractType.CDI), any(LocalDate.class), eq(pageable)))
                .thenReturn(Page.empty(pageable));

        candidateService.browseOffers(candidate, "java", "sfax", ContractType.CDI, pageable);

        verify(jobOfferRepository).searchActive(eq("java"), eq("sfax"), eq(ContractType.CDI), any(LocalDate.class), eq(pageable));
    }

    @Test
    void getOfferDetails_throwsWhenOfferNotFound() {
        User candidate = candidate(1L);

        when(jobOfferRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> candidateService.getOfferDetails(99L, candidate));
    }

    @Test
    void getOfferDetails_returnsDtoWithCorrectStatus() {
        User candidate = candidate(1L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5));

        when(jobOfferRepository.findById(10L)).thenReturn(Optional.of(offer));
        when(applicationRepository.existsByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(true);

        JobOfferWithStatusDto result = candidateService.getOfferDetails(10L, candidate);

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.isAlreadyApplied()).isTrue();
    }

    @Test
    void getDashboard_returnsCorrectCounts() {
        User candidate = candidate(1L);

        when(applicationRepository.countByCandidateId(1L)).thenReturn(5L);
        when(applicationRepository.countByCandidateIdAndStatus(1L, ApplicationStatus.PENDING)).thenReturn(2L);
        when(applicationRepository.countByCandidateIdAndStatus(1L, ApplicationStatus.ACCEPTED)).thenReturn(1L);
        when(applicationRepository.countByCandidateIdAndStatus(1L, ApplicationStatus.REJECTED)).thenReturn(2L);

        CandidateDashboardDto result = candidateService.getDashboard(candidate);

        assertThat(result.getTotalApplications()).isEqualTo(5L);
        assertThat(result.getPendingApplications()).isEqualTo(2L);
        assertThat(result.getAcceptedApplications()).isEqualTo(1L);
        assertThat(result.getRejectedApplications()).isEqualTo(2L);
    }

    @Test
    void getDashboard_returnsZerosWhenNoApplications() {
        User candidate = candidate(1L);

        when(applicationRepository.countByCandidateId(1L)).thenReturn(0L);
        when(applicationRepository.countByCandidateIdAndStatus(eq(1L), any())).thenReturn(0L);

        CandidateDashboardDto result = candidateService.getDashboard(candidate);

        assertThat(result.getTotalApplications()).isZero();
        assertThat(result.getPendingApplications()).isZero();
    }
}
