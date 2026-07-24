package com.hirehub.repository;

import com.hirehub.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    // Yelzem l candidat y postuli marra bark

    boolean existsByCandidateIdAndJobOfferId(Long candidateId, Long jobOfferId);

    List<Application> findByCandidateId(Long candidateId);
}