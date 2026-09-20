package com.hirehub.test;

import com.hirehub.service.CandidateProfileService;

import com.hirehub.dto.CandidateProfileRequestDto;
import com.hirehub.dto.CandidateProfileResponseDto;
import com.hirehub.dto.ExperienceDto;
import com.hirehub.entity.CandidateProfile;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.CandidateProfileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CandidateProfileServiceTest {

    @Mock private CandidateProfileRepository candidateProfileRepository;

    @InjectMocks private CandidateProfileService candidateProfileService;

    private User user(Long id) {
        return User.builder().id(id).firstName("Cand").lastName("Idate")
                .email("cand@test.com").role(Role.CANDIDATE).build();
    }

    private CandidateProfile emptyProfile(User user) {
        return CandidateProfile.builder()
                .id(user.getId()).user(user)
                .skills(new ArrayList<>())
                .experiences(new ArrayList<>())
                .build();
    }

    @Test
    void getMyProfile_throwsWhenProfileNotFound() {
        User user = user(1L);
        when(candidateProfileRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> candidateProfileService.getMyProfile(user));
    }

    @Test
    void getMyProfile_mapsUserFieldsCorrectly() {
        User user = user(1L);
        CandidateProfile profile = emptyProfile(user);

        when(candidateProfileRepository.findById(1L)).thenReturn(Optional.of(profile));

        CandidateProfileResponseDto result = candidateProfileService.getMyProfile(user);

        assertThat(result.getFirstName()).isEqualTo("Cand");
        assertThat(result.getEmail()).isEqualTo("cand@test.com");
    }

    @Test
    void updateMyProfile_throwsWhenProfileNotFound() {
        User user = user(1L);
        CandidateProfileRequestDto dto = new CandidateProfileRequestDto();

        when(candidateProfileRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> candidateProfileService.updateMyProfile(user, dto));
    }

    @Test
    void updateMyProfile_replacesSkillsCompletely() {
        User user = user(1L);
        CandidateProfile profile = emptyProfile(user);
        profile.getSkills().add("PHP"); // ancienne compétence à remplacer

        CandidateProfileRequestDto dto = new CandidateProfileRequestDto();
        dto.setSkills(List.of("Java", "Spring"));
        dto.setExperiences(List.of());

        when(candidateProfileRepository.findById(1L)).thenReturn(Optional.of(profile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateProfileResponseDto result = candidateProfileService.updateMyProfile(user, dto);

        assertThat(result.getSkills()).containsExactlyInAnyOrder("Java", "Spring");
        assertThat(result.getSkills()).doesNotContain("PHP");
    }

    @Test
    void updateMyProfile_handlesNullSkillsAndExperiencesGracefully() {
        User user = user(1L);
        CandidateProfile profile = emptyProfile(user);

        CandidateProfileRequestDto dto = new CandidateProfileRequestDto();
        dto.setSkills(null);
        dto.setExperiences(null);

        when(candidateProfileRepository.findById(1L)).thenReturn(Optional.of(profile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateProfileResponseDto result = candidateProfileService.updateMyProfile(user, dto);

        assertThat(result.getSkills()).isEmpty();
        assertThat(result.getExperiences()).isEmpty();
    }

    @Test
    void updateMyProfile_replacesExperiencesAndLinksThemToProfile() {
        User user = user(1L);
        CandidateProfile profile = emptyProfile(user);

        ExperienceDto expDto = ExperienceDto.builder()
                .position("Dev").company("Acme")
                .startDate(LocalDate.of(2020, 1, 1))
                .build();

        CandidateProfileRequestDto dto = new CandidateProfileRequestDto();
        dto.setExperiences(List.of(expDto));
        dto.setSkills(List.of());

        when(candidateProfileRepository.findById(1L)).thenReturn(Optional.of(profile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateProfileResponseDto result = candidateProfileService.updateMyProfile(user, dto);

        assertThat(result.getExperiences()).hasSize(1);
        assertThat(result.getExperiences().get(0).getPosition()).isEqualTo("Dev");
    }

    @Test
    void updateMyProfile_updatesSimpleFields() {
        User user = user(1L);
        CandidateProfile profile = emptyProfile(user);

        CandidateProfileRequestDto dto = new CandidateProfileRequestDto();
        dto.setUrlLinkedin("https://linkedin.com/in/test");
        dto.setBio("Passionate developer");
        dto.setSkills(List.of());
        dto.setExperiences(List.of());

        when(candidateProfileRepository.findById(1L)).thenReturn(Optional.of(profile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateProfileResponseDto result = candidateProfileService.updateMyProfile(user, dto);

        assertThat(result.getUrlLinkedin()).isEqualTo("https://linkedin.com/in/test");
        assertThat(result.getBio()).isEqualTo("Passionate developer");
    }
}
