package com.hirehub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

/**
 * The recruiter's own evaluation of an application (star ratings, checklist,
 * notes). A human judgment, separate from the automatic CV match score.
 */
@Entity
@Table(name = "application_evaluations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Application application;

    private int technicalSkills;
    private int experience;
    private int communication;
    private int culturalFit;

    private boolean hasDegree;
    private boolean passedTest;
    private boolean availableNow;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    private InterviewType interviewType;

    /** Out of 20: the average rating on 17 points, plus 1 point per checklist item. */
    private double score;

    @ManyToOne
    @JoinColumn(name = "evaluated_by_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User evaluatedBy;

    private LocalDateTime updatedAt;
}
