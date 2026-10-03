package com.hirehub.ratelimit;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

/**
 * Token buckets (Bucket4j), one per (limit, key), kept in memory. The cache is bounded and forgets
 * keys that have been quiet for longer than any limit's period, so random keys can't fill the memory.
 * <p>
 * In memory is right for a single backend instance. With several instances, the buckets would move
 * to a shared store (Bucket4j has Redis and JDBC back ends) without changing the callers.
 */
@Component
public class RateLimiter {

    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofHours(2))
            .maximumSize(100_000)
            .build();

    /** Takes one request from the key's allowance. Returns 0 if allowed, otherwise the seconds to wait. */
    public long tryConsume(RateLimit limit, String key) {
        String bucketKey = limit.name() + ":" + (key == null ? "" : key.trim().toLowerCase(Locale.ROOT));
        Bucket bucket = buckets.get(bucketKey, k -> newBucket(limit));
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            return 0;
        }
        return Math.max(1, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()) + 1);
    }

    /** Like {@link #tryConsume}, but refuses the request with a 429 when the allowance is used up. */
    public void check(RateLimit limit, String key) {
        long waitSeconds = tryConsume(limit, key);
        if (waitSeconds > 0) {
            throw new TooManyRequestsException(waitSeconds);
        }
    }

    /** Forgets every bucket (tests). */
    public void reset() {
        buckets.invalidateAll();
    }

    private static Bucket newBucket(RateLimit limit) {
        return Bucket.builder()
                .addLimit(l -> l.capacity(limit.capacity()).refillGreedy(limit.capacity(), limit.period()))
                .build();
    }
}
