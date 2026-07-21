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







}