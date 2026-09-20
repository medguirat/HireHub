package com.hirehub.repository;

import com.hirehub.entity.JobOffer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import com.hirehub.entity.ContractType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface JobOfferRepository extends JpaRepository<JobOffer, Long> {




    List<JobOffer> findByRecruiterId(Long recruiterId);
    Page<JobOffer> findByRecruiterId(Long recruiterId, Pageable pageable);

    @Query("SELECT j FROM JobOffer j WHERE " +
            "(:keyword IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "     OR LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:location IS NULL OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%'))) " +
            "AND (:contractType IS NULL OR j.contractType = :contractType)")
    Page<JobOffer> search(@Param("keyword") String keyword,
                          @Param("location") String location,
                          @Param("contractType") ContractType contractType,
                          Pageable pageable);

}