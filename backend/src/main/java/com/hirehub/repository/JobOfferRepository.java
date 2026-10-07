package com.hirehub.repository;

import com.hirehub.entity.JobOffer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import com.hirehub.entity.ContractType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface JobOfferRepository extends JpaRepository<JobOffer, Long> {




    List<JobOffer> findByRecruiterId(Long recruiterId);
    Page<JobOffer> findByRecruiterId(Long recruiterId, Pageable pageable);

    /** Candidate feed: only open offers whose deadline hasn't passed. */
    @Query("SELECT j FROM JobOffer j WHERE j.status = com.hirehub.entity.OfferStatus.OPEN " +
            "AND (j.deadline IS NULL OR j.deadline >= :today) " +
            "AND (:keyword IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "     OR LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:location IS NULL OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%'))) " +
            "AND (:contractType IS NULL OR j.contractType = :contractType)")
    Page<JobOffer> searchActive(@Param("keyword") String keyword,
                                @Param("location") String location,
                                @Param("contractType") ContractType contractType,
                                @Param("today") LocalDate today,
                                Pageable pageable);

    @Query("SELECT j FROM JobOffer j WHERE j.status = com.hirehub.entity.OfferStatus.OPEN " +
            "AND (j.deadline IS NULL OR j.deadline >= :today)")
    Page<JobOffer> findActive(@Param("today") LocalDate today, Pageable pageable);
}