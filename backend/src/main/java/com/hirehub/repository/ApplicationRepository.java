package com.hirehub.repository;

import com.hirehub.entity.Application;
import com.hirehub.entity.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    // Yelzem l candidat y postuli marra bark
    boolean existsByCandidateIdAndJobOfferId(Long candidateId, Long jobOfferId);

    List<Application> findByCandidateId(Long candidateId);
    Page<Application> findByCandidateId(Long candidateId, Pageable pageable);

    long countByCandidateId(Long candidateId);
    long countByCandidateIdAndStatus(Long candidateId, ApplicationStatus status);

    long countByJobOfferId(Long jobOfferId);

    List<Application> findByJobOffer_Recruiter_Id(Long recruiterId);
    Page<Application> findByJobOffer_Recruiter_Id(Long recruiterId, Pageable pageable);
}