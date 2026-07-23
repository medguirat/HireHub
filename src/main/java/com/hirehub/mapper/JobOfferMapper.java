package com.hirehub.mapper;

import com.hirehub.dto.JobOfferRequestDto;
import com.hirehub.dto.JobOfferResponseDto;
import com.hirehub.entity.JobOffer;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
// dit à MapStruct de generer une classe
public interface JobOfferMapper {

    @Mapping(target = "recruiterName ", source = "recruiter.firstName" )
    @Mapping(target = "recruiterLastName" , source = "recruiter.lastName")
    JobOfferResponseDto toResponseDto(JobOffer jobOffer);

    @Mapping(target="id", ignore = true)
    @Mapping(target ="publicationDate", ignore = true)
    @Mapping(target="recruiter", ignore = true)
    JobOffer toEntity(JobOfferRequestDto dto);

}
