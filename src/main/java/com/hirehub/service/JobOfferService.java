package com.hirehub.service;

import com.hirehub.dto.JobOfferResponseDto;
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

    public List<JobOfferResponseDto> getAllJobOffers() {

        List <JobOffer> jobOffers = jobOfferRepository.findAll();
        return jobOffers.stream().map(jobOffer -> JobOfferResponseDto.builder()
                .id(jobOffer.getId())
                .title(jobOffer.getTitle())
                .description(jobOffer.getDescription())
                .location(jobOffer.getLocation())
                .contractType(jobOffer.getContractType())
                .publicationDate(jobOffer.getPublicationDate())
                .deadline(jobOffer.getDeadline())
                .recruiterName(jobOffer.getRecruiter().getFirstName())
                .recruiterLastName(jobOffer.getRecruiter().getLastName())
                .build()
        ).toList();
    }

    public JobOfferResponseDto getJobOfferById(Long id) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Job offer not found"));

        return JobOfferResponseDto.builder()
                .id(jobOffer.getId())
                .title(jobOffer.getTitle())
                .description(jobOffer.getDescription())
                .location(jobOffer.getLocation())
                .contractType(jobOffer.getContractType())
                .publicationDate(jobOffer.getPublicationDate())
                .deadline(jobOffer.getDeadline())
                .recruiterName(jobOffer.getRecruiter().getFirstName())
                .recruiterLastName(jobOffer.getRecruiter().getLastName())
                .build();

    }

    public JobOfferResponseDto createJobOffer(JobOffer jobOffer) {

        if (jobOffer.getDeadline() == null) {
                throw new BadRequestException("Application deadline is required ");
        }

        if (jobOffer.getDeadline().isBefore(LocalDate.now())) {
            throw new BadRequestException("Application deadline must be in the future ");
        }

        jobOffer.setPublicationDate(LocalDate.now());

        JobOffer savedJobOffer = jobOfferRepository.save(jobOffer);

        return JobOfferResponseDto.builder()
                .id(savedJobOffer.getId())
                .title(savedJobOffer.getTitle())
                .description(savedJobOffer.getDescription())
                .location(savedJobOffer.getLocation())
                .contractType(savedJobOffer.getContractType())
                .publicationDate(savedJobOffer.getPublicationDate())
                .deadline(savedJobOffer.getDeadline())
                .recruiterName(savedJobOffer.getRecruiter().getFirstName())
                .recruiterLastName(savedJobOffer.getRecruiter().getLastName())
                .build();


    }

    public void deleteJobOffer(Long id) {

        jobOfferRepository.deleteById(id);

    }

    public JobOfferResponseDto updateJobOffer (Long id, JobOffer updateJobOffer) {
        JobOffer existingJobOffer = jobOfferRepository.findById(id)
                .orElseThrow(()-> new ResourceNotFoundException("Job offer not found"));

        existingJobOffer.setTitle(updateJobOffer.getTitle());
        existingJobOffer.setDescription(updateJobOffer.getDescription());
        existingJobOffer.setLocation(updateJobOffer.getLocation());
        existingJobOffer.setContractType(updateJobOffer.getContractType());
        existingJobOffer.setDeadline(updateJobOffer.getDeadline());

        JobOffer jobOffer = jobOfferRepository.save(existingJobOffer);

        return JobOfferResponseDto.builder()
                .id(jobOffer.getId())
                .title(jobOffer.getTitle())
                .description(jobOffer.getDescription())
                .location(jobOffer.getLocation())
                .contractType(jobOffer.getContractType())
                .publicationDate(jobOffer.getPublicationDate())
                .deadline(jobOffer.getDeadline())
                .recruiterName(jobOffer.getRecruiter().getFirstName())
                .recruiterLastName(jobOffer.getRecruiter().getLastName())
                .build();

    }

}