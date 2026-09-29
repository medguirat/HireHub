package com.hirehub.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDateTime;

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

    @Column(columnDefinition = "TEXT")
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

    /** Import of the company details from the website given at signup. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @ColumnDefault("'NOT_REQUESTED'")
    @Builder.Default
    private CompanyImportStatus companyImportStatus = CompanyImportStatus.NOT_REQUESTED;

    @Column(length = 500)
    private String companyImportMessage;

    private LocalDateTime companyImportUpdatedAt;

    /** Comma-separated names of the fields filled from the website and not edited since. */
    @Column(length = 500)
    private String autoFilledFields;
}
