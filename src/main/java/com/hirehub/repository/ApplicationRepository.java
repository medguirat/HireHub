package com.hirehub.repository;

import com.hirehub.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    // Yelzem l candidat y postuli marra bark

    boolean existsByCandidateIdAndJobOfferId(Long candidateId, Long jobOfferId);
}
