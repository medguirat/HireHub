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
import java.time.LocalDateTime;

@Service
public class CandidateService {

    private final JobOfferRepository jobOfferRepository;
    private final ApplicationRepository applicationRepository;

    public CandidateService(JobOfferRepository jobOfferRepository,
                            ApplicationRepository applicationRepository) {
        this.jobOfferRepository = jobOfferRepository;
        this.applicationRepository = applicationRepository;
    }

    static final long NEW_OFFER_HOURS = 48;

    /** Published in the last 48 hours; offers from before publishedAt existed only know their day. */
    static boolean isNewlyPublished(JobOffer offer, LocalDateTime now) {
        LocalDateTime published = offer.getPublishedAt() != null ? offer.getPublishedAt()
                : offer.getPublicationDate() != null ? offer.getPublicationDate().atStartOfDay() : null;
        return published != null && !published.isBefore(now.minusHours(NEW_OFFER_HOURS));
    }

    private JobOfferWithStatusDto toDto(JobOffer offer, Long candidateId) {
        boolean applied = applicationRepository.existsByCandidateIdAndJobOfferId(candidateId, offer.getId());
        boolean expired = offer.getDeadline() != null && offer.getDeadline().isBefore(LocalDate.now());

        RecruiterProfile profile = offer.getRecruiter().getRecruiterProfile();
        String cName = (profile != null && profile.getCompanyName() != null) ? profile.getCompanyName() : offer.getRecruiter().getFirstName() + " " + offer.getRecruiter().getLastName();
        String cWeb = (profile != null) ? profile.getWebsite() : null;
        String cLogo = (profile != null) ? profile.getLogo() : null;
        String cDesc = (profile != null) ? profile.getDescription() : null;
        String cInd = (profile != null) ? profile.getIndustry() : null;
        String cHq = (profile != null) ? profile.getHeadquarters() : null;

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
                .newlyPublished(isNewlyPublished(offer, LocalDateTime.now()))
                .companyName(cName)
                .companyWebsite(cWeb)
                .companyLogo(cLogo)
                .companyDescription(cDesc)
                .companyIndustry(cInd)
                .companyHeadquarters(cHq)
                .build();
    }

    public Page<JobOfferWithStatusDto> browseOffers(User candidate, String keyword, String location,
                                                    ContractType contractType, Pageable pageable) {
        Page<JobOffer> offers = jobOfferRepository.searchActive(
                blankToNull(keyword), blankToNull(location), contractType, LocalDate.now(), pageable);

        return offers.map(offer -> toDto(offer, candidate.getId()));
    }

    public JobOfferWithStatusDto getOfferDetails(Long offerId, User candidate) {
        JobOffer offer = jobOfferRepository.findById(offerId)
                .filter(o -> o.getStatus() == OfferStatus.OPEN)
                .orElseThrow(() -> new ResourceNotFoundException("This offer is no longer available."));

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