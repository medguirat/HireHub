package com.hirehub.mapper;

import com.hirehub.dto.JobOfferRequestDto;
import com.hirehub.dto.JobOfferResponseDto;
import com.hirehub.entity.JobOffer;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface JobOfferMapper {

    @Mapping(target = "recruiterName", source = "recruiter.firstName")
    @Mapping(target = "recruiterLastName", source = "recruiter.lastName")
    @Mapping(target = "applicationCount", ignore = true)
    JobOfferResponseDto toResponseDto(JobOffer jobOffer);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "publicationDate", ignore = true)
    @Mapping(target = "publishedAt", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "closedAt", ignore = true)
    @Mapping(target = "recruiter", ignore = true)
    JobOffer toEntity(JobOfferRequestDto dto);
}