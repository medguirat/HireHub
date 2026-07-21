package com.hirehub.controller;

import com.hirehub.dto.JobOfferRequestDto;
import com.hirehub.dto.JobOfferResponseDto;
import com.hirehub.entity.JobOffer;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.UserRepository;
import com.hirehub.service.RecruiterService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruiters")
public class RecruiterController {

    private final RecruiterService recruiterService;
    private final UserRepository userRepository;

    public RecruiterController (RecruiterService recruiterService,
                                UserRepository userRepository){
        this.recruiterService = recruiterService;
        this.userRepository= userRepository;
    }

    private User getAuthenticatedRecruiter(UserDetails userDetails){
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(()-> new ResourceNotFoundException("Recruiter not found"));

        if (user.getRole() != Role.RECRUITER){
            throw new BadRequestException("Only recruiters can perform this action");
        }

        return user;
    }

    @PostMapping("/offers")
    public JobOfferResponseDto createOffer(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody JobOfferRequestDto dto
    ){

        User recruiter = getAuthenticatedRecruiter(userDetails);
        return recruiterService.createOffer(dto,recruiter);
    }

    @GetMapping("/offers")
    public List<JobOfferResponseDto> getMyOffers(
                @AuthenticationPrincipal UserDetails userDetails
        ){

        User recruiter = getAuthenticatedRecruiter(userDetails);

        if(recruiter.getRole() != Role.RECRUITER){
            throw new RuntimeException(
                    "Only recruiters can see offers"
            );
        }

        return recruiterService.getRecruiterOffers(recruiter.getId());
    }

    @PutMapping("/offers/{offerId}")
    public JobOfferResponseDto updateOffer (
            @PathVariable Long offerId,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody JobOfferRequestDto dto
    ){

        User recruiter = getAuthenticatedRecruiter((userDetails));
        return recruiterService.updateOffer(offerId,dto, recruiter.getId());
    }

    @DeleteMapping("/offers/{offerId}")
    public ResponseEntity<String> deleteOffer(
            @PathVariable Long offerId,
            @AuthenticationPrincipal UserDetails userDetails
    ){
        if (userDetails == null ){
            throw new RuntimeException("User not authenticated");
        }

        User recruiter = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow();

        if(recruiter.getRole() != Role.RECRUITER){
            throw new RuntimeException(
                    "Only recruiters can modify offers"
            );
        }

        recruiterService.deleteOffer(offerId, recruiter.getId());

        return ResponseEntity.ok("Offer deleted successfully");
    }
}
