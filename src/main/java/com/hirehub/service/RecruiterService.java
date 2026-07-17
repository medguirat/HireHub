package com.hirehub.service;

import com.hirehub.entity.JobOffer;
import com.hirehub.repository.JobOfferRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class RecruiterService {

    private final JobOfferRepository jobOfferRepository;

    public RecruiterService (JobOfferRepository jobOfferRepository){
        this.jobOfferRepository=jobOfferRepository;
    }

    public List<JobOffer> getRecruiterOffers (Long recruiterId){
        return jobOfferRepository.findByRecruiterId(recruiterId);
    }

    public JobOffer createOffer(JobOffer jobOffer){

        jobOffer.setPublicationDate(LocalDate.now());

        return jobOfferRepository.save(jobOffer);
    }

    public JobOffer updateOffer ( Long offerId, JobOffer updatedOffer, Long recruiterId){

        JobOffer existingOffer = jobOfferRepository.findById(offerId)
                .orElseThrow(()-> new RuntimeException("Offer not found"));

        if (!existingOffer.getRecruiter().getId().equals(recruiterId)){
            throw new RuntimeException(("You cannot modify this offer"));
        }

        existingOffer.setTitle(updatedOffer.getTitle());
        existingOffer.setDescription(updatedOffer.getDescription());
        existingOffer.setLocation(updatedOffer.getLocation());
        existingOffer.setContractType(updatedOffer.getContractType());
        existingOffer.setDeadline(updatedOffer.getDeadline());

        return jobOfferRepository.save(existingOffer);
    }


    public void deleteOffer (Long offerId , Long recruiterId){
        JobOffer offer = jobOfferRepository.findById(offerId)
                .orElseThrow(()-> new RuntimeException("Offer not found"));

        if (!offer.getRecruiter().getId().equals(recruiterId)){
            throw new RuntimeException("You cannot delete this offer");
        }

        jobOfferRepository.delete(offer);
    }
}

