package com.hirehub.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate applicationDate;

    @Enumerated(EnumType.STRING)
    private ApplicationStatus status;

    /** The CV's file name, as shown to people. The file itself is {@link #cvFile}. */
    @Column(nullable = false)
    private String cv;

    /** The CV the candidate sent (private; null only for applications made before files were stored privately). */
    @ManyToOne
    @JoinColumn(name = "cv_file_id")
    private StoredFile cvFile;

    /** A written cover letter. */
    @Column(columnDefinition = "TEXT")
    private String coverLetter;

    /** A cover letter sent as a PDF instead (private). */
    @ManyToOne
    @JoinColumn(name = "cover_letter_file_id")
    private StoredFile coverLetterFile;

    private java.time.LocalDateTime interviewDate;

    @Column(columnDefinition = "TEXT")
    private String interviewLetter;

    @ManyToOne
    @JoinColumn(name = "candidate_id", nullable = false)
    private User candidate;

    @ManyToOne
    @JoinColumn(name = "job_offer_id", nullable = false)
    private JobOffer jobOffer;
}