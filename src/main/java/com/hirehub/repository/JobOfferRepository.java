package com.hirehub.repository;

import com.hirehub.entity.JobOffer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobOfferRepository extends JpaRepository<JobOffer, Long> {

    List<JobOffer> findByRecruiterId(Long recruiterId);

}