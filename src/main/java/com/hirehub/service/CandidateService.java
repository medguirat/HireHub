package com.hirehub.service;

import com.hirehub.dto.CandidateDashboardDto;
import com.hirehub.dto.JobOfferWithStatusDto;
import com.hirehub.entity.*;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.ApplicationRepository;
import com.hirehub.repository.JobOfferRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class CandidateService {

    private final JobOfferRepository jobOfferRepository;
    private final ApplicationRepository applicationRepository;

    public CandidateService(JobOfferRepository jobOfferRepository,
                            ApplicationRepository applicationRepository) {
        this.jobOfferRepository = jobOfferRepository;
        this.applicationRepository = applicationRepository;
    }

    private JobOfferWithStatusDto toDto(JobOffer offer, Long candidateId) {
        boolean applied = applicationRepository.existsByCandidateIdAndJobOfferId(candidateId, offer.getId());
        boolean expired = offer.getDeadline() != null && offer.getDeadline().isBefore(LocalDate.now());

        return JobOfferWithStatusDto.builder()
                .id(offer.getId())
                .title(offer.getTitle())
                .description(offer.getDescription())
                .location(offer.getLocation())
                .contractType(offer.getContractType())
                .publicationDate(offer.getPublicationDate())
                .deadline(offer.getDeadline())
                .recruiterName(offer.getRecruiter().getFirstName())
                .recruiterLastName(offer.getRecruiter().getLastName())
                .alreadyApplied(applied)
                .expired(expired)
                .build();
    }

    public Page<JobOfferWithStatusDto> browseOffers(User candidate, String keyword, String location,
                                                    ContractType contractType, Pageable pageable) {
        Page<JobOffer> offers = jobOfferRepository.search(
                blankToNull(keyword), blankToNull(location), contractType, pageable);

        return offers.map(offer -> toDto(offer, candidate.getId()));
    }

    public JobOfferWithStatusDto getOfferDetails(Long offerId, User candidate) {
        JobOffer offer = jobOfferRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Job offer not found"));

        return toDto(offer, candidate.getId());
    }

    public CandidateDashboardDto getDashboard(User candidate) {
        long total = applicationRepository.countByCandidateId(candidate.getId());
        long pending = applicationRepository.countByCandidateIdAndStatus(candidate.getId(), ApplicationStatus.PENDING);
        long accepted = applicationRepository.countByCandidateIdAndStatus(candidate.getId(), ApplicationStatus.ACCEPTED);
        long rejected = applicationRepository.countByCandidateIdAndStatus(candidate.getId(), ApplicationStatus.REJECTED);

        return CandidateDashboardDto.builder()
                .totalApplications(total)
                .pendingApplications(pending)
                .acceptedApplications(accepted)
                .rejectedApplications(rejected)
                .build();
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }
}