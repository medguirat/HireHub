package com.hirehub.company;

import com.hirehub.entity.RecruiterProfile;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.BiConsumer;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The recruiter-profile fields a website import may fill, with their column
 * limits, and the bookkeeping of which ones still hold the imported value.
 */
public final class CompanyFields {

    enum Kind { TEXT, URL, YEAR }

    record Field(String name, Kind kind, int maxLength,
                 Function<RecruiterProfile, Object> getter, BiConsumer<RecruiterProfile, Object> setter) {}

    static final Map<String, Field> FIELDS = new LinkedHashMap<>();

    static {
        text("companyName", 255, RecruiterProfile::getCompanyName, RecruiterProfile::setCompanyName);
        text("description", 255, RecruiterProfile::getDescription, RecruiterProfile::setDescription);
        url("logo", RecruiterProfile::getLogo, RecruiterProfile::setLogo);
        FIELDS.put("foundedYear", new Field("foundedYear", Kind.YEAR, 0, RecruiterProfile::getFoundedYear,
                (p, v) -> p.setFoundedYear((Integer) v)));
        text("mission", 3000, RecruiterProfile::getMission, RecruiterProfile::setMission);
        text("vision", 3000, RecruiterProfile::getVision, RecruiterProfile::setVision);
        text("companyValues", 3000, RecruiterProfile::getCompanyValues, RecruiterProfile::setCompanyValues);
        url("googleMapsUrl", RecruiterProfile::getGoogleMapsUrl, RecruiterProfile::setGoogleMapsUrl);
        text("headquarters", 255, RecruiterProfile::getHeadquarters, RecruiterProfile::setHeadquarters);
        text("offices", 2000, RecruiterProfile::getOffices, RecruiterProfile::setOffices);
        text("companySize", 255, RecruiterProfile::getCompanySize, RecruiterProfile::setCompanySize);
        text("technologies", 255, RecruiterProfile::getTechnologies, RecruiterProfile::setTechnologies);
        text("phone", 255, RecruiterProfile::getPhone, RecruiterProfile::setPhone);
        url("linkedin", RecruiterProfile::getLinkedin, RecruiterProfile::setLinkedin);
        url("facebook", RecruiterProfile::getFacebook, RecruiterProfile::setFacebook);
        url("instagram", RecruiterProfile::getInstagram, RecruiterProfile::setInstagram);
        url("twitter", RecruiterProfile::getTwitter, RecruiterProfile::setTwitter);
    }

    private CompanyFields() {
    }

    private static void text(String name, int max, Function<RecruiterProfile, String> getter,
                             BiConsumer<RecruiterProfile, String> setter) {
        FIELDS.put(name, new Field(name, Kind.TEXT, max, getter::apply, (p, v) -> setter.accept(p, (String) v)));
    }

    private static void url(String name, Function<RecruiterProfile, String> getter,
                            BiConsumer<RecruiterProfile, String> setter) {
        FIELDS.put(name, new Field(name, Kind.URL, 255, getter::apply, (p, v) -> setter.accept(p, (String) v)));
    }

    static boolean isBlank(Object value) {
        return value == null || (value instanceof String s && s.isBlank());
    }

    /** Shortens text at a sentence (or word) boundary so it fits its column. */
    static String fit(String text, int max) {
        if (text.length() <= max) {
            return text;
        }
        String cut = text.substring(0, max - 1);
        int sentence = Math.max(cut.lastIndexOf(". "), Math.max(cut.lastIndexOf("! "), cut.lastIndexOf("? ")));
        if (sentence > max / 2) {
            return cut.substring(0, sentence + 1);
        }
        int space = cut.lastIndexOf(' ');
        return (space > 0 ? cut.substring(0, space) : cut) + "…";
    }

    public static List<String> parse(String stored) {
        if (stored == null || stored.isBlank()) {
            return List.of();
        }
        return Arrays.stream(stored.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    public static String join(List<String> names) {
        return names.isEmpty() ? null : String.join(",", names);
    }

    /** Snapshot of the importable fields, to compare before/after an edit. */
    public static Map<String, Object> values(RecruiterProfile profile) {
        Map<String, Object> values = new LinkedHashMap<>();
        FIELDS.forEach((name, field) -> values.put(name, field.getter().apply(profile)));
        return values;
    }

    /** Keeps the "from your website" marker only on fields the edit left unchanged. */
    public static String stillAutoFilled(String stored, Map<String, Object> before, RecruiterProfile after) {
        return join(parse(stored).stream()
                .filter(FIELDS::containsKey)
                .filter(name -> Objects.equals(before.get(name), FIELDS.get(name).getter().apply(after)))
                .collect(Collectors.toList()));
    }
}
