package com.hirehub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

/**
 * Cached result of matching a candidate's CV against an offer. Valid only while
 * the CV version (sha256), the offer content (fingerprint) and the scoring
 * algorithm version are all unchanged.
 */
@Entity
@Table(name = "match_scores",
        uniqueConstraints = @UniqueConstraint(columnNames = {"candidate_id", "job_offer_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User candidate;

    @ManyToOne(optional = false)
    @JoinColumn(name = "job_offer_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private JobOffer jobOffer;

    @Column(nullable = false, length = 64)
    private String cvSha256;

    @Column(nullable = false, length = 64)
    private String offerFingerprint;

    @Column(nullable = false, length = 40)
    private String algorithmVersion;

    private int overallScore;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String resultJson;

    @Column(nullable = false)
    private LocalDateTime computedAt;
}
