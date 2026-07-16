package com.hirehub.repository;

import com.hirehub.entity.ContractType;
import com.hirehub.entity.JobOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface JobOfferRepository extends JpaRepository<JobOffer, Long> {

    @Query("""
        SELECT j FROM JobOffer j
        WHERE
        (:title IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', :title, '%')))
        AND
        (:location IS NULL OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%')))
        AND
        (:contractType IS NULL OR j.contractType = :contractType)
        """)
    List<JobOffer> searchJobOffers(
            @Param("title") String title,
            @Param("location") String location,
            @Param("contractType") ContractType contractType
    );

}