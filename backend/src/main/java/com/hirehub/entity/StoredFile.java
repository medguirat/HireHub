package com.hirehub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

/**
 * A private file a candidate attached to an application (CV or cover letter). The bytes live in
 * the private CV store (app.cv-storage-dir), never under the public /uploads folder, and are only
 * served by endpoints that check who is asking.
 */
@Entity
@Table(name = "stored_files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoredFile {

    /** Random, so an id seen once can't be used to guess others. */
    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User owner;

    /** The name shown to people and used for downloads (cleaned of any path). */
    @Column(nullable = false)
    private String originalName;

    /** The file's name inside the private store. */
    @Column(nullable = false)
    private String storedName;

    @Column(nullable = false)
    private String contentType;

    private long sizeBytes;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
