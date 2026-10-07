package com.hirehub.dto;

/**
 * What "delete offer" actually did: an offer with applications is closed
 * (archived) instead of being deleted, so nobody loses their history.
 */
public record OfferDeletionResultDto(Outcome outcome, String message) {

    public enum Outcome { DELETED, CLOSED }
}
