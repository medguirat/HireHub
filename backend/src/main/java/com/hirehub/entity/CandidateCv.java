package com.hirehub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

/**
 * The candidate's current CV, used for matching. One per candidate: uploading
 * a new file replaces it. The SHA-256 of the file is its version, which keys
 * the match-score cache.
 */
@Entity
@Table(name = "candidate_cv_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateCv {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "candidate_id", nullable = false, unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User candidate;

    @Column(nullable = false)
    private String originalFileName;

    @Column(nullable = false)
    private String storedFileName;

    private String contentType;

    private long sizeBytes;

    @Column(nullable = false, length = 64)
    private String sha256;

    /** Null until the ai-service has extracted it (it may have been down at upload time). */
    @Column(columnDefinition = "LONGTEXT")
    private String extractedText;

    @Column(nullable = false)
    private LocalDateTime uploadedAt;
}
