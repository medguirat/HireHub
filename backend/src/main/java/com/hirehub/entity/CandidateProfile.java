package com.hirehub.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "candidate_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateProfile {

    @Id
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    private String urlLinkedin;

    private String urlGithub;

    private String urlPortfolio;

    /** Current or target job title, e.g. "Java backend developer". */
    @Column(length = 150)
    private String headline;

    /** Degrees and schools, as the candidate writes them. */
    @Column(length = 1000)
    private String education;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private String picture;

    @ElementCollection
    @CollectionTable(
            name = "candidate_skills",
            joinColumns = @JoinColumn(name = "candidate_profile_id")
    )
    @Column(name = "skill")
    @Builder.Default
    private List<String> skills = new ArrayList<>();

    @OneToMany(mappedBy = "candidateProfile", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Experience> experiences = new ArrayList<>();
}