package com.hirehub.service;

import com.hirehub.entity.*;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.ApplicationRepository;
import com.hirehub.repository.JobOfferRepository;
import com.hirehub.repository.UserRepository;
import com.hirehub.exception.BadRequestException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

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

    public List<Application> getAllApplications (){
        return applicationRepository.findAll();
    }

    public Application getApplicationById (Long id){
        return applicationRepository.findById(id)
                .orElseThrow(()-> new ResourceNotFoundException("Application not found "));
    }

    public Application createApplication (Application app) {

        User candidate = userRepository.findById(app.getCandidate().getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Candidate not found."));

        JobOffer jobOffer = jobOfferRepository.findById(app.getJobOffer().getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Job offer not found."));

        if (jobOffer.getDeadline().isBefore(LocalDate.now())) {
            throw new BadRequestException("The application deadline has passed.");
        }

        if (candidate.getRole() != Role.CANDIDATE) {
            throw new BadRequestException(
                    "Only candidates can apply for job offers."
            );
        }

        if (applicationRepository.existsByCandidateIdAndJobOfferId(
                candidate.getId(),
                jobOffer.getId())) {

            throw new BadRequestException(
                    "You have already applied for this job offer."
            );
        }



        app.setStatus(ApplicationStatus.PENDING);
        app.setApplicationDate(LocalDate.now());
        app.setCandidate(candidate);
        app.setJobOffer(jobOffer);



        return applicationRepository.save(app);
    }

    public Application updateApplicationStatus (Long id , Application app ){
        Application existingApp = applicationRepository.findById(id)
                .orElseThrow(()-> new ResourceNotFoundException("Application not found"));

        if (app.getStatus() == null) {
            throw new BadRequestException("Application status is required.");
        }

        if (app.getStatus() == ApplicationStatus.PENDING) {
            throw new BadRequestException(
                    "Application cannot be set back to PENDING."
            );
        }

        if (existingApp.getStatus() != ApplicationStatus.PENDING) {
            throw new BadRequestException(
                    "Application has already been processed."
            );
        }

        existingApp.setStatus(app.getStatus());

        return applicationRepository.save(existingApp);
    }


    public void deleteApplication (Long id){
        Application application = applicationRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Application not found."));
        applicationRepository.delete(application);
    }
}
