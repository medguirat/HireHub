package com.hirehub.dto;

/** A file the candidate just uploaded, to attach to an application by its id. */
public record StoredFileDto(String id, String fileName, long size) {
}
