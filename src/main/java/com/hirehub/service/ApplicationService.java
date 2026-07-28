package com.hirehub.service;

import com.hirehub.dto.ApplicationResponseDto;
import com.hirehub.entity.*;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.ApplicationRepository;
import com.hirehub.repository.JobOfferRepository;
import com.hirehub.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final JobOfferRepository jobOfferRepository;

    public ApplicationService(ApplicationRepository applicationRepository,
                              UserRepository userRepository,
                              JobOfferRepository jobOfferRepository) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.jobOfferRepository = jobOfferRepository;
    }

    // ---------- mapping ----------

    private ApplicationResponseDto toDto(Application application) {
        return ApplicationResponseDto.builder()
                .id(application.getId())
                .status(application.getStatus())
                .cv(application.getCv())
                .coverLetter(application.getCoverLetter())
                .candidateName(application.getCandidate().getFirstName())
                .candidateLastName(application.getCandidate().getLastName())
                .jobOfferTitle(application.getJobOffer().getTitle())
                .build();
    }

    // ---------- authorization helpers ----------

    private boolean isOwnerCandidate(Application app, User user) {
        return app.getCandidate().getId().equals(user.getId());
    }

    private boolean isOwnerRecruiter(Application app, User user) {
        return app.getJobOffer().getRecruiter().getId().equals(user.getId());
    }

    // ---------- use cases ----------

    /**
     * Un candidat ne voit que ses propres candidatures.
     * Un recruteur ne voit que les candidatures reçues sur ses offres.
     */
    public Page<ApplicationResponseDto> getAllApplications(User currentUser, Pageable pageable) {
        Page<Application> applications;

        if (currentUser.getRole() == Role.CANDIDATE) {
            applications = applicationRepository.findByCandidateId(currentUser.getId(), pageable);
        } else if (currentUser.getRole() == Role.RECRUITER) {
            applications = applicationRepository.findByJobOffer_Recruiter_Id(currentUser.getId(), pageable);
        } else {
            applications = Page.empty(pageable);
        }

        return applications.map(this::toDto);
    }

    public ApplicationResponseDto getApplicationById(Long id, User currentUser) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        if (!isOwnerCandidate(application, currentUser) && !isOwnerRecruiter(application, currentUser)) {
            throw new BadRequestException("You are not allowed to access this application.");
        }

        return toDto(application);
    }

    public ApplicationResponseDto createApplication(Application app, User currentUser) {

        if (currentUser.getRole() != Role.CANDIDATE) {
            throw new BadRequestException("Only candidates can apply for job offers.");
        }

        User candidate = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));

        if (app.getJobOffer() == null || app.getJobOffer().getId() == null) {
            throw new BadRequestException("Job offer id is required.");
        }

        JobOffer jobOffer = jobOfferRepository.findById(app.getJobOffer().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Job offer not found."));

        if (jobOffer.getDeadline().isBefore(LocalDate.now())) {
            throw new BadRequestException("The application deadline has passed.");
        }

        if (applicationRepository.existsByCandidateIdAndJobOfferId(candidate.getId(), jobOffer.getId())) {
            throw new BadRequestException("You have already applied for this job offer.");
        }

        app.setId(null);
        app.setStatus(ApplicationStatus.PENDING);
        app.setApplicationDate(LocalDate.now());
        app.setCandidate(candidate);
        app.setJobOffer(jobOffer);

        Application saved = applicationRepository.save(app);
        return toDto(saved);
    }

    public ApplicationResponseDto updateApplicationStatus(Long id, Application app, User currentUser) {
        Application existingApp = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        if (currentUser.getRole() != Role.RECRUITER || !isOwnerRecruiter(existingApp, currentUser)) {
            throw new BadRequestException("You are not allowed to update this application.");
        }

        if (app.getStatus() == null) {
            throw new BadRequestException("Application status is required.");
        }

        if (app.getStatus() == ApplicationStatus.PENDING) {
            throw new BadRequestException("Application cannot be set back to PENDING.");
        }

        if (existingApp.getStatus() != ApplicationStatus.PENDING) {
            throw new BadRequestException("Application has already been processed.");
        }

        existingApp.setStatus(app.getStatus());

        Application saved = applicationRepository.save(existingApp);
        return toDto(saved);
    }

    public void deleteApplication(Long id, User currentUser) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found."));

        boolean candidateWithdraws = isOwnerCandidate(application, currentUser)
                && application.getStatus() == ApplicationStatus.PENDING;

        boolean recruiterManages = isOwnerRecruiter(application, currentUser);

        if (!candidateWithdraws && !recruiterManages) {
            throw new BadRequestException("You are not allowed to delete this application.");
        }

        applicationRepository.delete(application);
    }
}