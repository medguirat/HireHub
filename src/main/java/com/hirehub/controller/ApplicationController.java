package com.hirehub.controller;

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
    public List<Application> getAllApplications (){
        return applicationService.getAllApplications();
    }

    @GetMapping("/{id}")
    public Application getApplicationById (@PathVariable Long id){
        return applicationService.getApplicationById(id);
    }

    @PostMapping
    public Application createApplication (@RequestBody Application app){
        return applicationService.createApplication(app);
    }

    @DeleteMapping("/{id}")
    public void deleteApplication (@PathVariable Long id){
        applicationService.deleteApplication(id);
    }

    @PatchMapping("/{id}/status")
    public Application updateStatus (@PathVariable Long id , @RequestBody Application app ){
        return applicationService.updateApplicationStatus(id, app);
    }
}
