package com.hirehub.service;

import com.hirehub.dto.JobOfferRequestDto;
import com.hirehub.dto.JobOfferResponseDto;
import com.hirehub.entity.JobOffer;
import com.hirehub.entity.User;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.mapper.JobOfferMapper;
import com.hirehub.repository.JobOfferRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class RecruiterService {

    private final JobOfferRepository jobOfferRepository;
    private final JobOfferMapper jobOfferMapper;

    public RecruiterService (JobOfferRepository jobOfferRepository,
                             JobOfferMapper jobOfferMapper){

        this.jobOfferRepository=jobOfferRepository;
        this.jobOfferMapper=jobOfferMapper;
    }

    public List<JobOfferResponseDto> getRecruiterOffers (Long recruiterId){
        return jobOfferRepository.findByRecruiterId(recruiterId)
                .stream().
                map(jobOfferMapper::toResponseDto)
                .toList();
    }

    public JobOfferResponseDto getRecruiterOfferById (Long offerId, Long recruiterId){
        JobOffer offer = jobOfferRepository.findById(offerId)
                .orElseThrow(()->new ResourceNotFoundException("Job offer not found"));

        if (!offer.getRecruiter().getId().equals(recruiterId)){
            throw new BadRequestException("You are not allowed to access this offer");
        }

        return jobOfferMapper.toResponseDto(offer);
    }

    public JobOfferResponseDto createOffer(JobOfferRequestDto dto,
                                           User recruiter){

        if (dto.getDeadline().isBefore(LocalDate.now())){
            throw new BadRequestException("Application deadline must be in the future");
        }

        JobOffer jobOffer = jobOfferMapper.toEntity(dto);
        jobOffer.setRecruiter(recruiter);
        jobOffer.setPublicationDate(LocalDate.now());

        JobOffer savedJobOffer = jobOfferRepository.save(jobOffer);
        return jobOfferMapper.toResponseDto(savedJobOffer);
    }

    public JobOfferResponseDto updateOffer ( Long offerId,
                                             JobOfferRequestDto dto,
                                             Long recruiterId){
        JobOffer existingOffer = jobOfferRepository.findById(offerId)
                .orElseThrow(()-> new ResourceNotFoundException("Offer not found"));

        if (!existingOffer.getRecruiter().getId().equals(recruiterId)){
            throw new BadRequestException("You cannot modifiy this offer ");

        }

        if (dto.getDeadline().isBefore(LocalDate.now())){
            throw new BadRequestException("Application deadline must be in the future ");
        }

        existingOffer.setTitle(dto.getTitle());
        existingOffer.setDescription(dto.getDescription());
        existingOffer.setLocation(dto.getLocation());
        existingOffer.setContractType(dto.getContractType());
        existingOffer.setDeadline(dto.getDeadline());

        JobOffer updated = jobOfferRepository.save(existingOffer);
        return jobOfferMapper.toResponseDto(updated);


    }

    public void deleteOffer (Long offerId , Long recruiterId){
        JobOffer offer = jobOfferRepository.findById(offerId)
                .orElseThrow(()-> new ResourceNotFoundException("Offer not found"));

        if (!offer.getRecruiter().getId().equals(recruiterId)){
            throw new BadRequestException("You cannot delete this offer");
        }

        jobOfferRepository.delete(offer);
    }
}

