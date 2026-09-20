package com.hirehub.service;

import com.hirehub.dto.JobOfferResponseDto;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.mapper.JobOfferMapper;
import com.hirehub.repository.JobOfferRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.hirehub.entity.JobOffer;

@Service
public class JobOfferService {

    private final JobOfferRepository jobOfferRepository;
    private final JobOfferMapper jobOfferMapper;

    public JobOfferService(JobOfferRepository jobOfferRepository,
                           JobOfferMapper jobOfferMapper) {
        this.jobOfferRepository = jobOfferRepository;
        this.jobOfferMapper = jobOfferMapper;
    }

    public Page<JobOfferResponseDto> getAllJobOffers(Pageable pageable) {
        return jobOfferRepository.findAll(pageable)
                .map(jobOfferMapper::toResponseDto);
    }

    public JobOfferResponseDto getJobOfferById(Long id) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job offer not found"));

        return jobOfferMapper.toResponseDto(jobOffer);
    }
}