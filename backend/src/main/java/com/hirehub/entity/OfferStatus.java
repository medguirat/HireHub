package com.hirehub.entity;

/**
 * OPEN offers are visible to candidates (while their deadline hasn't passed).
 * CLOSED offers are archived: hidden from the feed, but kept with their
 * applications so candidates and recruiters can still see them.
 */
public enum OfferStatus {
    OPEN,
    CLOSED
}
