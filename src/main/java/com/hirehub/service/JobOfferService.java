package com.hirehub.service;

import com.hirehub.dto.JobOfferResponseDto;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.mapper.JobOfferMapper;
import com.hirehub.repository.JobOfferRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import com.hirehub.entity.JobOffer;

@Service
public class JobOfferService {

    private final JobOfferRepository jobOfferRepository;
    private final JobOfferMapper jobOfferMapper;

    public JobOfferService(JobOfferRepository jobOfferRepository,
                           JobOfferMapper jobOfferMapper) {

        this.jobOfferRepository = jobOfferRepository;
        this.jobOfferMapper= jobOfferMapper;
    }

    public List<JobOfferResponseDto> getAllJobOffers() {

        return jobOfferRepository.findAll()
                .stream()
                .map(jobOfferMapper :: toResponseDto)
                .toList();
    }

    public JobOfferResponseDto getJobOfferById(Long id) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Job offer not found"));

        return jobOfferMapper.toResponseDto(jobOffer);

    }







}