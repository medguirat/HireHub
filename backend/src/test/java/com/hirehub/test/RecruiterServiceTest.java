package com.hirehub.test;

import com.hirehub.service.RecruiterService;

import com.hirehub.dto.JobOfferRequestDto;
import com.hirehub.dto.JobOfferResponseDto;
import com.hirehub.entity.ContractType;
import com.hirehub.entity.JobOffer;
import com.hirehub.entity.User;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.mapper.JobOfferMapper;
import com.hirehub.repository.JobOfferRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecruiterServiceTest {

    @Mock private JobOfferRepository jobOfferRepository;
    @Mock private JobOfferMapper jobOfferMapper;

    @InjectMocks private RecruiterService recruiterService;

    private User recruiter(Long id) {
        return User.builder().id(id).firstName("Rec").lastName("Ru").build();
    }

    @Test
    void createOffer_throwsWhenDeadlineInPast() {
        JobOfferRequestDto dto = new JobOfferRequestDto();
        dto.setDeadline(LocalDate.now().minusDays(1));

        assertThrows(BadRequestException.class,
                () -> recruiterService.createOffer(dto, recruiter(1L)));
    }

    @Test
    void createOffer_succeedsAndSetsPublicationDate() {
        JobOfferRequestDto dto = new JobOfferRequestDto();
        dto.setTitle("Dev Java");
        dto.setDescription("desc");
        dto.setLocation("Sfax");
        dto.setContractType(ContractType.CDI);
        dto.setDeadline(LocalDate.now().plusDays(10));

        JobOffer entity = JobOffer.builder().title("Dev Java").build();
        JobOffer saved = JobOffer.builder().id(1L).title("Dev Java")
                .publicationDate(LocalDate.now()).recruiter(recruiter(1L)).build();

        when(jobOfferMapper.toEntity(dto)).thenReturn(entity);
        when(jobOfferRepository.save(any(JobOffer.class))).thenReturn(saved);
        when(jobOfferMapper.toResponseDto(saved)).thenReturn(
                JobOfferResponseDto.builder().id(1L).title("Dev Java").build());

        JobOfferResponseDto result = recruiterService.createOffer(dto, recruiter(1L));

        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    void getRecruiterOfferById_throwsWhenOfferNotFound() {
        when(jobOfferRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> recruiterService.getRecruiterOfferById(1L, 99L));
    }

    @Test
    void getRecruiterOfferById_throwsWhenNotOwner() {
        JobOffer offer = JobOffer.builder().id(1L).recruiter(recruiter(2L)).build();

        when(jobOfferRepository.findById(1L)).thenReturn(Optional.of(offer));

        assertThrows(BadRequestException.class,
                () -> recruiterService.getRecruiterOfferById(1L, 99L));
    }

    @Test
    void updateOffer_throwsWhenNotOwner() {
        JobOffer offer = JobOffer.builder().id(1L).recruiter(recruiter(2L))
                .deadline(LocalDate.now().plusDays(5)).build();

        JobOfferRequestDto dto = new JobOfferRequestDto();
        dto.setDeadline(LocalDate.now().plusDays(10));

        when(jobOfferRepository.findById(1L)).thenReturn(Optional.of(offer));

        assertThrows(BadRequestException.class,
                () -> recruiterService.updateOffer(1L, dto, 99L));
    }

    @Test
    void updateOffer_throwsWhenDeadlineInPast() {
        JobOffer offer = JobOffer.builder().id(1L).recruiter(recruiter(1L)).build();

        JobOfferRequestDto dto = new JobOfferRequestDto();
        dto.setDeadline(LocalDate.now().minusDays(1));

        when(jobOfferRepository.findById(1L)).thenReturn(Optional.of(offer));

        assertThrows(BadRequestException.class,
                () -> recruiterService.updateOffer(1L, dto, 1L));
    }

    @Test
    void deleteOffer_throwsWhenNotOwner() {
        JobOffer offer = JobOffer.builder().id(1L).recruiter(recruiter(2L)).build();

        when(jobOfferRepository.findById(1L)).thenReturn(Optional.of(offer));

        assertThrows(BadRequestException.class,
                () -> recruiterService.deleteOffer(1L, 99L));
    }

    @Test
    void deleteOffer_succeedsForOwner() {
        JobOffer offer = JobOffer.builder().id(1L).recruiter(recruiter(1L)).build();

        when(jobOfferRepository.findById(1L)).thenReturn(Optional.of(offer));

        recruiterService.deleteOffer(1L, 1L);
    }
}
