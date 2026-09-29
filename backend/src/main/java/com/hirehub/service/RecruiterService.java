package com.hirehub.service;

import com.hirehub.dto.JobOfferRequestDto;
import com.hirehub.dto.JobOfferResponseDto;
import com.hirehub.dto.OfferDeletionResultDto;
import com.hirehub.entity.JobOffer;
import com.hirehub.entity.OfferStatus;
import com.hirehub.entity.User;
import com.hirehub.repository.ApplicationRepository;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.mapper.JobOfferMapper;
import com.hirehub.repository.JobOfferRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class RecruiterService {

    private final JobOfferRepository jobOfferRepository;
    private final JobOfferMapper jobOfferMapper;
    private final ApplicationRepository applicationRepository;

    public RecruiterService(JobOfferRepository jobOfferRepository,
                            JobOfferMapper jobOfferMapper,
                            ApplicationRepository applicationRepository) {
        this.jobOfferRepository = jobOfferRepository;
        this.jobOfferMapper = jobOfferMapper;
        this.applicationRepository = applicationRepository;
    }

    /** The recruiter's offers, closed ones included, each with its number of applications. */
    public Page<JobOfferResponseDto> getRecruiterOffers(Long recruiterId, Pageable pageable) {
        return jobOfferRepository.findByRecruiterId(recruiterId, pageable)
                .map(offer -> {
                    JobOfferResponseDto dto = jobOfferMapper.toResponseDto(offer);
                    dto.setApplicationCount(applicationRepository.countByJobOfferId(offer.getId()));
                    return dto;
                });
    }

    public JobOfferResponseDto getRecruiterOfferById(Long offerId, Long recruiterId) {
        JobOffer offer = jobOfferRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Job offer not found"));

        if (!offer.getRecruiter().getId().equals(recruiterId)) {
            throw new BadRequestException("You are not allowed to access this offer");
        }

        return jobOfferMapper.toResponseDto(offer);
    }

    public JobOfferResponseDto createOffer(JobOfferRequestDto dto, User recruiter) {

        if (dto.getDeadline().isBefore(LocalDate.now())) {
            throw new BadRequestException("Application deadline must be in the future");
        }

        JobOffer jobOffer = jobOfferMapper.toEntity(dto);
        jobOffer.setRecruiter(recruiter);
        jobOffer.setPublicationDate(LocalDate.now());
        jobOffer.setPublishedAt(LocalDateTime.now());
        jobOffer.setStatus(OfferStatus.OPEN);

        JobOffer savedJobOffer = jobOfferRepository.save(jobOffer);
        return jobOfferMapper.toResponseDto(savedJobOffer);
    }

    public JobOfferResponseDto updateOffer(Long offerId, JobOfferRequestDto dto, Long recruiterId) {
        JobOffer existingOffer = jobOfferRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found"));

        if (!existingOffer.getRecruiter().getId().equals(recruiterId)) {
            throw new BadRequestException("You cannot modify this offer");
        }

        if (dto.getDeadline().isBefore(LocalDate.now())) {
            throw new BadRequestException("Application deadline must be in the future");
        }

        existingOffer.setTitle(dto.getTitle());
        existingOffer.setDescription(dto.getDescription());
        existingOffer.setLocation(dto.getLocation());
        existingOffer.setContractType(dto.getContractType());
        existingOffer.setDeadline(dto.getDeadline());

        JobOffer updated = jobOfferRepository.save(existingOffer);
        return jobOfferMapper.toResponseDto(updated);
    }

    /**
     * Deletes an offer nobody applied to. An offer with applications is closed
     * instead: it leaves the candidate feed, but the recruiter keeps it and its
     * applicants, and candidates still see it in their applications.
     */
    public OfferDeletionResultDto deleteOffer(Long offerId, Long recruiterId) {
        JobOffer offer = jobOfferRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found"));

        if (!offer.getRecruiter().getId().equals(recruiterId)) {
            throw new BadRequestException("You cannot delete this offer");
        }

        long applications = applicationRepository.countByJobOfferId(offerId);
        if (applications > 0) {
            if (offer.getStatus() != OfferStatus.CLOSED) {
                offer.setStatus(OfferStatus.CLOSED);
                offer.setClosedAt(LocalDateTime.now());
                jobOfferRepository.save(offer);
            }
            return new OfferDeletionResultDto(OfferDeletionResultDto.Outcome.CLOSED,
                    "This offer has " + applications + (applications == 1 ? " application" : " applications")
                            + ", so it was closed instead of deleted. It no longer appears to candidates, "
                            + "and you can still review its applicants.");
        }

        jobOfferRepository.delete(offer);
        return new OfferDeletionResultDto(OfferDeletionResultDto.Outcome.DELETED, "The offer has been deleted.");
    }
}