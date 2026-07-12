package com.hirehub.service;

import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.JobOfferRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import com.hirehub.entity.JobOffer;

@Service
public class JobOfferService {

    private final JobOfferRepository jobOfferRepository;

    public JobOfferService(JobOfferRepository jobOfferRepository) {
        this.jobOfferRepository = jobOfferRepository;
    }

    public List<JobOffer> getAllJobOffers() {

        return jobOfferRepository.findAll();
    }

    public JobOffer getJobOfferById(Long id) {

        return jobOfferRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Job offer not found"));

    }

    public JobOffer createJobOffer(JobOffer jobOffer) {

        if (jobOffer.getDeadline() == null) {
                throw new BadRequestException("Application deadline is required ");
        }

        if (jobOffer.getDeadline().isBefore(LocalDate.now())) {
            throw new BadRequestException("Application deadline must be in the future ");
        }

        jobOffer.setPublicationDate(LocalDate.now());

        return jobOfferRepository.save(jobOffer);
    }

    public void deleteJobOffer(Long id) {

        jobOfferRepository.deleteById(id);

    }

    public JobOffer updateJobOffer (Long id, JobOffer updateJobOffer) {
        JobOffer existingJobOffer = jobOfferRepository.findById(id)
                .orElseThrow(()-> new ResourceNotFoundException("Job offer not found"));

        existingJobOffer.setTitle(updateJobOffer.getTitle());
        existingJobOffer.setDescription(updateJobOffer.getDescription());
        existingJobOffer.setLocation(updateJobOffer.getLocation());
        existingJobOffer.setContractType(updateJobOffer.getContractType());
        existingJobOffer.setDeadline(updateJobOffer.getDeadline());

        return jobOfferRepository.save(existingJobOffer);
    }

}