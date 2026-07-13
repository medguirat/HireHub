package com.hirehub.controller;

import com.hirehub.dto.ApplicationResponseDto;
import com.hirehub.entity.Application;
import com.hirehub.service.ApplicationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService ;

    public ApplicationController (ApplicationService applicationService){
        this.applicationService=applicationService;
    }

    @GetMapping
    public List<ApplicationResponseDto> getAllApplications (){
        return applicationService.getAllApplications();
    }

    @GetMapping("/{id}")
    public ApplicationResponseDto getApplicationById (@PathVariable Long id){
        return applicationService.getApplicationById(id);
    }

    @PostMapping
    public ApplicationResponseDto createApplication (@RequestBody Application app){
        return applicationService.createApplication(app);
    }

    @DeleteMapping("/{id}")
    public void deleteApplication (@PathVariable Long id){
        applicationService.deleteApplication(id);
    }

    @PatchMapping("/{id}/status")
    public ApplicationResponseDto updateStatus (@PathVariable Long id , @RequestBody Application app ){
        return applicationService.updateApplicationStatus(id, app);
    }
}
