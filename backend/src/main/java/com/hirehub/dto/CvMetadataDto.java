package com.hirehub.dto;

import java.time.LocalDateTime;

/** What the candidate sees about their stored CV. */
public record CvMetadataDto(String fileName, long sizeBytes, LocalDateTime uploadedAt, boolean textExtracted) {}
