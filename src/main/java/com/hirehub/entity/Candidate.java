package com.hirehub.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "candidates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Candidate extends User {

    private String cvUrl;

    @Column(columnDefinition = "TEXT")
    private String skills;

    private Integer yearsOfExperience;
}