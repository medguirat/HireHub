package com.hirehub.service;

import com.hirehub.exception.ForbiddenException;

import com.hirehub.dto.ApplicationRequestDto;
import com.hirehub.dto.ApplicationResponseDto;
import com.hirehub.dto.ApplicationStatusUpdateDto;
import com.hirehub.entity.*;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.ApplicationRepository;
import com.hirehub.repository.JobOfferRepository;
import com.hirehub.repository.UserRepository;
import com.hirehub.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final JobOfferRepository jobOfferRepository;
    private final NotificationRepository notificationRepository;

    public ApplicationService(ApplicationRepository applicationRepository,
                              UserRepository userRepository,
                              JobOfferRepository jobOfferRepository,
                              NotificationRepository notificationRepository) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.jobOfferRepository = jobOfferRepository;
        this.notificationRepository = notificationRepository;
    }


    private ApplicationResponseDto toDto(Application application) {
        String companyName = null;
        if (application.getJobOffer().getRecruiter().getRecruiterProfile() != null) {
            companyName = application.getJobOffer().getRecruiter().getRecruiterProfile().getCompanyName();
        }
        if (companyName == null || companyName.trim().isEmpty()) {
            companyName = application.getJobOffer().getRecruiter().getFirstName() + " " + application.getJobOffer().getRecruiter().getLastName();
        }

        return ApplicationResponseDto.builder()
                .id(application.getId())
                .status(application.getStatus())
                .applicationDate(application.getApplicationDate())
                .cv(application.getCv())
                .coverLetter(application.getCoverLetter())
                .candidateName(application.getCandidate().getFirstName())
                .candidateLastName(application.getCandidate().getLastName())
                .jobOfferTitle(application.getJobOffer().getTitle())
                .jobOfferId(application.getJobOffer().getId())
                .offerClosed(application.getJobOffer().getStatus() == OfferStatus.CLOSED)
                .recruiterCompany(companyName)
                .interviewDate(application.getInterviewDate())
                .interviewLetter(application.getInterviewLetter())
                .build();
    }


    private boolean isOwnerCandidate(Application app, User user) {
        return app.getCandidate().getId().equals(user.getId());
    }

    private boolean isOwnerRecruiter(Application app, User user) {
        return app.getJobOffer().getRecruiter().getId().equals(user.getId());
    }



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
            throw new ForbiddenException("You are not allowed to access this application.");
        }

        return toDto(application);
    }

    public ApplicationResponseDto createApplication(ApplicationRequestDto dto, User currentUser) {

        User candidate = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));

        JobOffer jobOffer = jobOfferRepository.findById(dto.getJobOfferId())
                .orElseThrow(() -> new ResourceNotFoundException("Job offer not found."));

        if (jobOffer.getStatus() == OfferStatus.CLOSED) {
            throw new BadRequestException("This offer has been closed and no longer accepts applications.");
        }

        if (jobOffer.getDeadline() != null && jobOffer.getDeadline().isBefore(LocalDate.now())) {
            throw new BadRequestException("The application deadline has passed.");
        }

        if (applicationRepository.existsByCandidateIdAndJobOfferId(candidate.getId(), jobOffer.getId())) {
            throw new BadRequestException("You have already applied for this job offer.");
        }

        Application app = Application.builder()
                .cv(dto.getCv())
                .coverLetter(dto.getCoverLetter())
                .status(ApplicationStatus.PENDING)
                .applicationDate(LocalDate.now())
                .candidate(candidate)
                .jobOffer(jobOffer)
                .build();

        Application saved = applicationRepository.save(app);
        return toDto(saved);
    }

    public ApplicationResponseDto updateApplicationStatus(Long id, ApplicationStatusUpdateDto dto, User currentUser) {
        Application existingApp = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        if (currentUser.getRole() != Role.RECRUITER || !isOwnerRecruiter(existingApp, currentUser)) {
            throw new ForbiddenException("You are not allowed to update this application.");
        }

        if (dto.getStatus() == ApplicationStatus.PENDING) {
            throw new BadRequestException("Application cannot be set back to PENDING.");
        }

        if (existingApp.getStatus() != ApplicationStatus.PENDING) {
            throw new BadRequestException("Application has already been processed.");
        }

        existingApp.setStatus(dto.getStatus());

        if (dto.getStatus() == ApplicationStatus.ACCEPTED) {
            if (dto.getInterviewDate() == null) {
                throw new BadRequestException("Interview date and time are required when accepting an application.");
            }

            existingApp.setInterviewDate(dto.getInterviewDate());

            String candidateName = existingApp.getCandidate().getFirstName() + " " + existingApp.getCandidate().getLastName();
            String jobTitle = existingApp.getJobOffer().getTitle();
            
            String companyName = null;
            if (existingApp.getJobOffer().getRecruiter().getRecruiterProfile() != null) {
                companyName = existingApp.getJobOffer().getRecruiter().getRecruiterProfile().getCompanyName();
            }
            if (companyName == null || companyName.trim().isEmpty()) {
                companyName = "our company";
            }

            String recruiterName = existingApp.getJobOffer().getRecruiter().getFirstName() + " " + existingApp.getJobOffer().getRecruiter().getLastName();

            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
            String formattedDate = dto.getInterviewDate().format(formatter);

            String letter = dto.getInterviewLetter();
            if (letter == null || letter.trim().isEmpty()) {
                letter = String.format(
                    "Dear %s,\n\n" +
                    "We are pleased to invite you for an interview regarding the %s position.\n\n" +
                    "Details of the interview:\n" +
                    "Date & Time: %s\n" +
                    "Company: %s\n" +
                    "Contact: %s\n\n" +
                    "Best regards,\n" +
                    "The Recruitment Team\n" +
                    "%s",
                    candidateName, jobTitle, formattedDate, companyName, recruiterName, companyName
                );
            }
            existingApp.setInterviewLetter(letter);

            // Create notification for the candidate
            Notification notif = Notification.builder()
                    .user(existingApp.getCandidate())
                    .message(String.format("Congratulations! You have been invited to an interview for the position \"%s\" at %s. Scheduled for: %s.", jobTitle, companyName, formattedDate))
                    .createdAt(java.time.LocalDateTime.now())
                    .isRead(false)
                    .application(existingApp)
                    .build();
            notificationRepository.save(notif);
        }

        Application saved = applicationRepository.save(existingApp);
        return toDto(saved);
    }

    public ApplicationResponseDto updateApplicationStatus(Long id, Application app, User currentUser) {
        Application existingApp = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        if (currentUser.getRole() != Role.RECRUITER || !isOwnerRecruiter(existingApp, currentUser)) {
            throw new ForbiddenException("You are not allowed to update this application.");
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

        boolean ownerCandidate = isOwnerCandidate(application, currentUser);
        boolean recruiterManages = isOwnerRecruiter(application, currentUser);

        if (!ownerCandidate && !recruiterManages) {
            throw new ForbiddenException("You are not allowed to delete this application.");
        }
        if (ownerCandidate && !recruiterManages && application.getStatus() != ApplicationStatus.PENDING) {
            throw new BadRequestException("This application has already been reviewed, so it can no longer be withdrawn.");
        }

        applicationRepository.delete(application);
    }
}