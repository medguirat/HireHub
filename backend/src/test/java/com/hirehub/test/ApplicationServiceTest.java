package com.hirehub.test;

import com.hirehub.service.ApplicationService;

import com.hirehub.dto.ApplicationRequestDto;
import com.hirehub.dto.ApplicationResponseDto;
import com.hirehub.dto.ApplicationStatusUpdateDto;
import com.hirehub.entity.*;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.ApplicationRepository;
import com.hirehub.repository.JobOfferRepository;
import com.hirehub.repository.NotificationRepository;
import com.hirehub.repository.UserRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private JobOfferRepository jobOfferRepository;
    @Mock private NotificationRepository notificationRepository;

    @InjectMocks private ApplicationService applicationService;

    private User candidate(Long id) {
        return User.builder().id(id).firstName("Cand").lastName("Idate").role(Role.CANDIDATE).build();
    }

    private User recruiter(Long id) {
        return User.builder().id(id).firstName("Rec").lastName("Ruiter").role(Role.RECRUITER).build();
    }

    private JobOffer offer(Long id, LocalDate deadline, User recruiter) {
        return JobOffer.builder().id(id).title("Dev").deadline(deadline).recruiter(recruiter).build();
    }

    private Application application(Long id, User candidate, JobOffer offer, ApplicationStatus status) {
        return Application.builder()
                .id(id).candidate(candidate).jobOffer(offer).status(status)
                .cv("cv.pdf").applicationDate(LocalDate.now())
                .build();
    }

    // ---------- createApplication ----------

    @Test
    void createApplication_throwsWhenJobOfferNotFound() {
        User candidate = candidate(1L);
        ApplicationRequestDto dto = new ApplicationRequestDto();
        dto.setCv("cv.pdf");
        dto.setJobOfferId(99L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(candidate));
        when(jobOfferRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> applicationService.createApplication(dto, candidate));
    }

    @Test
    void createApplication_throwsWhenCandidateNotFound() {
        User candidate = candidate(1L);
        ApplicationRequestDto dto = new ApplicationRequestDto();
        dto.setCv("cv.pdf");
        dto.setJobOfferId(10L);

        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> applicationService.createApplication(dto, candidate));
    }

    @Test
    void createApplication_throwsWhenDeadlinePassed() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        JobOffer offer = offer(10L, LocalDate.now().minusDays(1), recruiter);

        ApplicationRequestDto dto = new ApplicationRequestDto();
        dto.setCv("cv.pdf");
        dto.setJobOfferId(10L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(candidate));
        when(jobOfferRepository.findById(10L)).thenReturn(Optional.of(offer));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> applicationService.createApplication(dto, candidate));
        assertThat(ex.getMessage()).contains("deadline");
    }

    @Test
    void createApplication_throwsWhenAlreadyApplied() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);

        ApplicationRequestDto dto = new ApplicationRequestDto();
        dto.setCv("cv.pdf");
        dto.setJobOfferId(10L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(candidate));
        when(jobOfferRepository.findById(10L)).thenReturn(Optional.of(offer));
        when(applicationRepository.existsByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(true);

        assertThrows(BadRequestException.class,
                () -> applicationService.createApplication(dto, candidate));
    }

    @Test
    void createApplication_succeedsAndForcesStatusPending() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);

        ApplicationRequestDto dto = new ApplicationRequestDto();
        dto.setCv("cv.pdf");
        dto.setCoverLetter("Motivated candidate");
        dto.setJobOfferId(10L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(candidate));
        when(jobOfferRepository.findById(10L)).thenReturn(Optional.of(offer));
        when(applicationRepository.existsByCandidateIdAndJobOfferId(1L, 10L)).thenReturn(false);
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> {
            Application a = inv.getArgument(0);
            a.setId(100L);
            return a;
        });

        ApplicationResponseDto result = applicationService.createApplication(dto, candidate);

        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getStatus()).isEqualTo(ApplicationStatus.PENDING);
        assertThat(result.getJobOfferTitle()).isEqualTo("Dev");
    }

    // ---------- getAllApplications ----------

    @Test
    void getAllApplications_returnsCandidateOwnApplicationsForCandidateRole() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);
        Application app = application(50L, candidate, offer, ApplicationStatus.PENDING);

        Pageable pageable = PageRequest.of(0, 10);
        Page<Application> page = new PageImpl<>(List.of(app));

        when(applicationRepository.findByCandidateId(1L, pageable)).thenReturn(page);

        Page<ApplicationResponseDto> result = applicationService.getAllApplications(candidate, pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(applicationRepository, never()).findByJobOffer_Recruiter_Id(anyLong(), any());
    }

    @Test
    void getAllApplications_returnsReceivedApplicationsForRecruiterRole() {
        User recruiter = recruiter(2L);
        Pageable pageable = PageRequest.of(0, 10);

        when(applicationRepository.findByJobOffer_Recruiter_Id(2L, pageable))
                .thenReturn(Page.empty(pageable));

        applicationService.getAllApplications(recruiter, pageable);

        verify(applicationRepository).findByJobOffer_Recruiter_Id(2L, pageable);
        verify(applicationRepository, never()).findByCandidateId(anyLong(), any());
    }

    // ---------- getApplicationById ----------

    @Test
    void getApplicationById_throwsWhenNeitherOwnerCandidateNorOwnerRecruiter() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        User stranger = candidate(3L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);
        Application app = application(50L, candidate, offer, ApplicationStatus.PENDING);

        when(applicationRepository.findById(50L)).thenReturn(Optional.of(app));

        assertThrows(BadRequestException.class,
                () -> applicationService.getApplicationById(50L, stranger));
    }

    @Test
    void getApplicationById_succeedsForOwnerCandidate() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);
        Application app = application(50L, candidate, offer, ApplicationStatus.PENDING);

        when(applicationRepository.findById(50L)).thenReturn(Optional.of(app));

        ApplicationResponseDto result = applicationService.getApplicationById(50L, candidate);

        assertThat(result.getId()).isEqualTo(50L);
    }

    // ---------- updateApplicationStatus ----------

    @Test
    void updateApplicationStatus_throwsWhenCallerIsNotOwnerRecruiter() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        User otherRecruiter = recruiter(3L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);
        Application app = application(50L, candidate, offer, ApplicationStatus.PENDING);

        ApplicationStatusUpdateDto dto = new ApplicationStatusUpdateDto();
        dto.setStatus(ApplicationStatus.ACCEPTED);

        when(applicationRepository.findById(50L)).thenReturn(Optional.of(app));

        assertThrows(BadRequestException.class,
                () -> applicationService.updateApplicationStatus(50L, dto, otherRecruiter));
    }

    @Test
    void updateApplicationStatus_throwsWhenSettingBackToPending() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);
        Application app = application(50L, candidate, offer, ApplicationStatus.PENDING);

        ApplicationStatusUpdateDto dto = new ApplicationStatusUpdateDto();
        dto.setStatus(ApplicationStatus.PENDING);

        when(applicationRepository.findById(50L)).thenReturn(Optional.of(app));

        assertThrows(BadRequestException.class,
                () -> applicationService.updateApplicationStatus(50L, dto, recruiter));
    }

    @Test
    void updateApplicationStatus_throwsWhenAlreadyProcessed() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);
        Application app = application(50L, candidate, offer, ApplicationStatus.ACCEPTED);

        ApplicationStatusUpdateDto dto = new ApplicationStatusUpdateDto();
        dto.setStatus(ApplicationStatus.REJECTED);

        when(applicationRepository.findById(50L)).thenReturn(Optional.of(app));

        assertThrows(BadRequestException.class,
                () -> applicationService.updateApplicationStatus(50L, dto, recruiter));
    }

    @Test
    void updateApplicationStatus_succeedsForOwnerRecruiter() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);
        Application app = application(50L, candidate, offer, ApplicationStatus.PENDING);

        ApplicationStatusUpdateDto dto = new ApplicationStatusUpdateDto();
        dto.setStatus(ApplicationStatus.ACCEPTED);
        dto.setInterviewDate(java.time.LocalDateTime.now().plusDays(3));

        when(applicationRepository.findById(50L)).thenReturn(Optional.of(app));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        ApplicationResponseDto result = applicationService.updateApplicationStatus(50L, dto, recruiter);

        assertThat(result.getStatus()).isEqualTo(ApplicationStatus.ACCEPTED);
    }

    // ---------- deleteApplication ----------

    @Test
    void deleteApplication_candidateCanWithdrawWhenPending() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);
        Application app = application(50L, candidate, offer, ApplicationStatus.PENDING);

        when(applicationRepository.findById(50L)).thenReturn(Optional.of(app));

        applicationService.deleteApplication(50L, candidate);

        verify(applicationRepository).delete(app);
    }

    @Test
    void deleteApplication_candidateCannotWithdrawWhenAlreadyProcessed() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);
        Application app = application(50L, candidate, offer, ApplicationStatus.ACCEPTED);

        when(applicationRepository.findById(50L)).thenReturn(Optional.of(app));

        assertThrows(BadRequestException.class,
                () -> applicationService.deleteApplication(50L, candidate));
    }

    @Test
    void deleteApplication_recruiterCanDeleteRegardlessOfStatus() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);
        Application app = application(50L, candidate, offer, ApplicationStatus.ACCEPTED);

        when(applicationRepository.findById(50L)).thenReturn(Optional.of(app));

        applicationService.deleteApplication(50L, recruiter);

        verify(applicationRepository).delete(app);
    }

    @Test
    void deleteApplication_throwsWhenStrangerTries() {
        User candidate = candidate(1L);
        User recruiter = recruiter(2L);
        User stranger = candidate(99L);
        JobOffer offer = offer(10L, LocalDate.now().plusDays(5), recruiter);
        Application app = application(50L, candidate, offer, ApplicationStatus.PENDING);

        when(applicationRepository.findById(50L)).thenReturn(Optional.of(app));

        assertThrows(BadRequestException.class,
                () -> applicationService.deleteApplication(50L, stranger));
    }
}
