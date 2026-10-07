package com.hirehub.company;

import com.fasterxml.jackson.databind.JsonNode;
import com.hirehub.entity.CompanyImportStatus;
import com.hirehub.entity.RecruiterProfile;
import com.hirehub.matching.AiServiceUnavailableException;
import com.hirehub.repository.RecruiterProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

/**
 * Fills a recruiter's company profile from their company website, in the
 * background. It never blocks or fails the signup, and never overwrites a
 * value the recruiter already entered: only empty fields are filled, and only
 * with what the website states.
 */
@Service
public class CompanyProfileImporter {

    private static final Logger log = LoggerFactory.getLogger(CompanyProfileImporter.class);

    /** An import still "in progress" after this long was interrupted (e.g. a restart). */
    static final Duration STALE_AFTER = Duration.ofMinutes(3);

    static final String INVALID_URL = "This website address isn't valid, so we couldn't import your company details. "
            + "You can fill them in yourself.";
    static final String SERVICE_DOWN = "We couldn't import your company details right now. "
            + "Try again in a moment, or fill them in yourself.";
    static final String INTERRUPTED = "The import of your company details was interrupted. Try again, or fill them in yourself.";
    static final String NOTHING_FOUND = "We couldn't find company details on your website. Please fill in your profile yourself.";

    private final RecruiterProfileRepository profileRepository;
    private final CompanyScraperClient scraperClient;
    private final TransactionTemplate transactionTemplate;
    private final Executor executor;

    public CompanyProfileImporter(RecruiterProfileRepository profileRepository,
                                  CompanyScraperClient scraperClient,
                                  TransactionTemplate transactionTemplate,
                                  @Qualifier("companyImportExecutor") Executor executor) {
        this.profileRepository = profileRepository;
        this.scraperClient = scraperClient;
        this.transactionTemplate = transactionTemplate;
        this.executor = executor;
    }

    /**
     * Records the website on the (already saved) profile and starts the import once
     * the current transaction has committed. Never throws for a bad address.
     */
    public void requestImport(RecruiterProfile profile, String website) {
        String trimmed = website == null ? "" : website.trim();
        String url = normalize(trimmed);
        // Stored with its scheme, as the profile form's URL field expects.
        profile.setWebsite(url != null ? url : trimmed.isEmpty() ? profile.getWebsite() : trimmed);
        profile.setCompanyImportUpdatedAt(LocalDateTime.now());
        if (url == null) {
            profile.setCompanyImportStatus(CompanyImportStatus.FAILED);
            profile.setCompanyImportMessage(INVALID_URL);
            return;
        }
        profile.setCompanyImportStatus(CompanyImportStatus.IN_PROGRESS);
        profile.setCompanyImportMessage(null);
        Long profileId = profile.getId();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    submit(profileId, url);
                }
            });
        } else {
            submit(profileId, url);
        }
    }

    public boolean isRunning(RecruiterProfile profile) {
        return effectiveStatus(profile) == CompanyImportStatus.IN_PROGRESS;
    }

    /** The stored status, except that an import stuck "in progress" counts as failed. */
    public static CompanyImportStatus effectiveStatus(RecruiterProfile profile) {
        CompanyImportStatus status = profile.getCompanyImportStatus();
        if (status == CompanyImportStatus.IN_PROGRESS && isStale(profile)) {
            return CompanyImportStatus.FAILED;
        }
        return status == null ? CompanyImportStatus.NOT_REQUESTED : status;
    }

    public static String effectiveMessage(RecruiterProfile profile) {
        if (profile.getCompanyImportStatus() == CompanyImportStatus.IN_PROGRESS && isStale(profile)) {
            return INTERRUPTED;
        }
        return profile.getCompanyImportMessage();
    }

    private static boolean isStale(RecruiterProfile profile) {
        LocalDateTime since = profile.getCompanyImportUpdatedAt();
        return since == null || since.isBefore(LocalDateTime.now().minus(STALE_AFTER));
    }

    /** Absolute http(s) URL with a dotted host name, or null. The ai-service re-validates it. */
    static String normalize(String website) {
        if (website == null || website.isBlank() || website.length() > 2048) {
            return null;
        }
        String candidate = website.matches("(?i)^[a-z][a-z0-9+.-]*://.*") ? website : "https://" + website;
        try {
            URI uri = URI.create(candidate);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
            String host = uri.getHost();
            if (!(scheme.equals("http") || scheme.equals("https")) || host == null || !host.contains(".")
                    || uri.getUserInfo() != null) {
                return null;
            }
            return candidate;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private void submit(Long profileId, String url) {
        try {
            executor.execute(() -> run(profileId, url));
        } catch (RejectedExecutionException e) {
            log.warn("Company import queue full; not importing {} for profile {}", url, profileId);
            finish(profileId, CompanyImportStatus.FAILED, SERVICE_DOWN);
        }
    }

    void run(Long profileId, String url) {
        try {
            CompanyScraperClient.ScrapedCompany scraped = scraperClient.scrape(url);
            transactionTemplate.executeWithoutResult(status -> apply(profileId, scraped.fields()));
        } catch (CompanyScrapeException e) {
            log.info("Company import of {} for profile {} failed: {} ({})", url, profileId, e.getMessage(), e.getCode());
            finish(profileId, CompanyImportStatus.FAILED,
                    e.getMessage() + " You can fill in your company details yourself.");
        } catch (AiServiceUnavailableException e) {
            log.warn("Company import of {} for profile {}: ai-service unavailable: {}", url, profileId, e.getMessage());
            finish(profileId, CompanyImportStatus.FAILED, SERVICE_DOWN);
        } catch (RuntimeException e) {
            log.error("Company import of {} for profile {} failed unexpectedly", url, profileId, e);
            finish(profileId, CompanyImportStatus.FAILED, SERVICE_DOWN);
        }
    }

    private void apply(Long profileId, JsonNode scraped) {
        RecruiterProfile profile = profileRepository.findById(profileId).orElse(null);
        if (profile == null) {
            return;
        }
        List<String> filled = new ArrayList<>(CompanyFields.parse(profile.getAutoFilledFields()));
        int count = 0;
        for (CompanyFields.Field field : CompanyFields.FIELDS.values()) {
            JsonNode node = scraped == null ? null : scraped.get(field.name());
            Object value = valueFor(field, node);
            if (value == null || !CompanyFields.isBlank(field.getter().apply(profile))) {
                continue; // nothing found, or the recruiter already entered something
            }
            field.setter().accept(profile, value);
            if (!filled.contains(field.name())) {
                filled.add(field.name());
            }
            count++;
        }
        profile.setAutoFilledFields(CompanyFields.join(filled));
        profile.setCompanyImportStatus(CompanyImportStatus.COMPLETED);
        profile.setCompanyImportMessage(count == 0 ? NOTHING_FOUND
                : "We filled " + count + " field" + (count > 1 ? "s" : "")
                  + " from your website. Please review them and correct anything that's off.");
        profile.setCompanyImportUpdatedAt(LocalDateTime.now());
        profileRepository.save(profile);
        log.info("Company import for profile {} filled {} field(s)", profileId, count);
    }

    private static Object valueFor(CompanyFields.Field field, JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return switch (field.kind()) {
            case YEAR -> node.canConvertToInt() && node.asInt() >= 1800 && node.asInt() <= LocalDateTime.now().getYear()
                    ? node.asInt() : null;
            case URL -> {
                String url = node.asText("").trim();
                // A cut URL is a broken link: drop it rather than shorten it.
                yield url.matches("(?i)^https?://\\S+$") && url.length() <= field.maxLength() ? url : null;
            }
            case TEXT -> {
                String text = node.asText("").trim();
                // Never cut imported text: a value longer than its column is left out for the recruiter to write.
                yield text.isEmpty() || text.length() > field.maxLength() ? null : text;
            }
        };
    }

    private void finish(Long profileId, CompanyImportStatus status, String message) {
        try {
            transactionTemplate.executeWithoutResult(tx -> profileRepository.findById(profileId).ifPresent(profile -> {
                profile.setCompanyImportStatus(status);
                profile.setCompanyImportMessage(message);
                profile.setCompanyImportUpdatedAt(LocalDateTime.now());
                profileRepository.save(profile);
            }));
        } catch (RuntimeException e) {
            log.error("Could not record the company import result for profile {}", profileId, e);
        }
    }
}
