package com.hirehub.mapper;

import com.hirehub.dto.ApplicationResponseDto;
import com.hirehub.entity.Application;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ApplicationMapper {

    @Mapping(source = "candidate.firstName", target = "candidateName")
    @Mapping(source = "candidate.lastName", target = "candidateLastName")
    @Mapping(source = "jobOffer.title", target = "jobOfferTitle")
    ApplicationResponseDto toDto(Application application);
}
