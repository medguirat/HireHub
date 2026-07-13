package com.hirehub.controller;

import com.hirehub.dto.JobOfferResponseDto;
import com.hirehub.entity.JobOffer;
import com.hirehub.service.JobOfferService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/joboffers")
public class JobOfferController {

    private final JobOfferService jobOfferService;

    public JobOfferController(JobOfferService jobOfferService) {
        this.jobOfferService = jobOfferService;
    }

    @GetMapping
    public List<JobOfferResponseDto> getAllJobOffers() {
        return jobOfferService.getAllJobOffers();
    }

    @GetMapping("/{id}")
    public JobOfferResponseDto getJobOfferById(@PathVariable Long id) {
        return jobOfferService.getJobOfferById(id);
    }

    @PostMapping
    public JobOfferResponseDto createJobOffer (@RequestBody JobOffer jobOffer){
        return jobOfferService.createJobOffer(jobOffer);
    }

    @DeleteMapping("/{id}")
    public void deleteJobOffer(@PathVariable Long id) {
        jobOfferService.deleteJobOffer(id);
    }

    @PutMapping("/{id}")
    public JobOfferResponseDto updateJobOffer (@PathVariable Long id , @RequestBody JobOffer jobOffer ){
        return jobOfferService.updateJobOffer(id , jobOffer);
    }

}