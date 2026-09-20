package com.hirehub.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "recruiter_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecruiterProfile {

    @Id
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    private String companyName;

    private String website;

    private String logo;

    private String description;

    private Integer foundedYear;

    private String industry;

    @Column(length = 3000)
    private String mission;

    @Column(length = 3000)
    private String vision;

    @Column(length = 3000)
    private String companyValues;

    private String googleMapsUrl;

    private String headquarters;

    @Column(length = 2000)
    private String offices;

    private String companySize;

    private String companyType;

    private String technologies;

    private String phone;

    private String linkedin;

    private String facebook;

    private String instagram;

    private String twitter;
}