package com.hirehub.controller;

import com.hirehub.dto.JobOfferResponseDto;
import com.hirehub.dto.PageResponseDto;
import com.hirehub.service.JobOfferService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/joboffers")
public class JobOfferController {

    private final JobOfferService jobOfferService;

    public JobOfferController(JobOfferService jobOfferService) {
        this.jobOfferService = jobOfferService;
    }

    @GetMapping
    public PageResponseDto<JobOfferResponseDto> getAllJobOffers(
            @PageableDefault(size = 10, sort = "id") Pageable pageable
    ) {
        return PageResponseDto.from(jobOfferService.getAllJobOffers(pageable));
    }

    @GetMapping("/{id}")
    public JobOfferResponseDto getJobOfferById(@PathVariable Long id) {
        return jobOfferService.getJobOfferById(id);
    }
}