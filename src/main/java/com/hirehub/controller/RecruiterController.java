package com.hirehub.controller;

import com.hirehub.entity.JobOffer;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
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

    @PostMapping("/offers")
    public JobOffer createOffer(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody JobOffer jobOffer
    ){

        if (userDetails == null){
            throw new RuntimeException("User not authenticated");
        }

        User recruiter = userRepository.findByEmail(
                userDetails.getUsername()
                )
                .orElseThrow(()-> new RuntimeException(" Recruiter not found"));


        if(recruiter.getRole() != Role.RECRUITER){
            throw new RuntimeException("Only recruiters can create offers");
        }

        jobOffer.setRecruiter(recruiter);

        return recruiterService.createOffer(jobOffer);
    }

    @GetMapping("/offers")
    public List<JobOffer> getMyOffers(
                @AuthenticationPrincipal UserDetails userDetails
        ){

        User recruiter = userRepository.findByEmail(
                userDetails.getUsername()
        ).orElseThrow(() -> new RuntimeException("Recruiter not found "));

        if(recruiter.getRole() != Role.RECRUITER){
            throw new RuntimeException(
                    "Only recruiters can see offers"
            );
        }

        return recruiterService.getRecruiterOffers(recruiter.getId());
    }

    @PutMapping("/offers/{offerId}")
    public JobOffer updateOffer (
            @PathVariable Long offerId,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody JobOffer jobOffer
    ){
        if (userDetails == null ){
            throw new RuntimeException(("User not authenticated"));
        }
        User recruiter = userRepository.findByEmail(
                userDetails.getUsername()
        ).orElseThrow(()->new RuntimeException("Recruiter not found"));

        if(recruiter.getRole() != Role.RECRUITER){
            throw new RuntimeException(
                    "Only recruiters can update offers"
            );
        }

        return recruiterService.updateOffer(offerId,jobOffer, recruiter.getId());
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
