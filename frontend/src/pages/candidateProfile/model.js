// The candidate profile's form model: field lists, conversion from and to the API, validation and
// the completeness checklist. No React here, so it can be tested on its own.
import { focusField, isValidUrl, normalizeUrl } from "../../utils/profile";

export const EMPTY_EXPERIENCE = { position: "", company: "", startDate: "", endDate: "" };
export const EMPTY_LANGUAGE = { language: "", level: "PROFESSIONAL" };
// Same levels as the backend (LanguageLevel), shown with their CEFR equivalents.
export const LANGUAGE_LEVELS = [
  { value: "NATIVE", label: "Native or bilingual" },
  { value: "FLUENT", label: "Fluent (C1–C2)" },
  { value: "PROFESSIONAL", label: "Professional (B2)" },
  { value: "INTERMEDIATE", label: "Intermediate (B1)" },
  { value: "BASIC", label: "Basic (A1–A2)" },
];
export const levelLabel = (value) => LANGUAGE_LEVELS.find((l) => l.value === value)?.label || value;
export const COMMON_LANGUAGES = ["Arabic", "English", "French", "German", "Italian", "Spanish", "Chinese", "Turkish", "Portuguese", "Russian"];
export const LINKS = [
  { key: "urlLinkedin", label: "LinkedIn" },
  { key: "urlGithub", label: "GitHub" },
  { key: "urlPortfolio", label: "Portfolio" },
];

export const toForm = (p) => ({
  firstName: p.firstName || "",
  lastName: p.lastName || "",
  headline: p.headline || "",
  education: p.education || "",
  bio: p.bio || "",
  picture: p.picture || "",
  urlLinkedin: p.urlLinkedin || "",
  urlGithub: p.urlGithub || "",
  urlPortfolio: p.urlPortfolio || "",
  skills: [...(p.skills || [])],
  experiences: (p.experiences || []).map((e) => ({ ...EMPTY_EXPERIENCE, ...e, endDate: e.endDate || "" })),
  languages: (p.languages || []).map((l) => ({ ...l })),
});

/** Field key -> message, for every problem in the form (empty when it can be saved). */
export function validate(form) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = "Your first name is required.";
  if (!form.lastName.trim()) errors.lastName = "Your last name is required.";
  if (form.headline.length > 150) errors.headline = "At most 150 characters.";
  if (form.education.length > 1000) errors.education = "At most 1000 characters.";
  if (form.bio.length > 2000) errors.bio = "At most 2000 characters.";
  LINKS.forEach(({ key, label }) => {
    if (!isValidUrl(form[key])) errors[key] = `This doesn't look like a ${label} address.`;
  });
  const seen = new Set();
  form.languages.forEach((l, i) => {
    const name = l.language.trim().toLowerCase();
    if (!name) errors[`language-${i}`] = "Enter the language, or remove this row.";
    else if (seen.has(name)) errors[`language-${i}`] = "This language is already listed.";
    seen.add(name);
  });
  form.experiences.forEach((e, i) => {
    if (!e.position.trim() || !e.company.trim() || !e.startDate) {
      errors[`experience-${i}`] = "Position, company and start date are required.";
    } else if (e.endDate && e.endDate < e.startDate) {
      errors[`experience-${i}`] = "The end date is before the start date.";
    }
  });
  return errors;
}

/** What the profile still lacks, each with a weight and a way to fix it (opens the form on the field). */
export function completenessItems(profile, hasCv, setEditing) {
  const edit = (id) => () => focusField(setEditing, id);
  return [
    { key: "picture", weight: 10, done: !!profile.picture, suggestion: "Add a profile photo", onFix: edit("profile-picture") },
    { key: "headline", weight: 15, done: !!profile.headline, suggestion: "Add a headline (your job title)", onFix: edit("profile-headline") },
    { key: "bio", weight: 10, done: (profile.bio || "").trim().length >= 40, suggestion: "Write a short bio", onFix: edit("profile-bio") },
    { key: "skills", weight: 15, done: (profile.skills || []).length >= 3, suggestion: "List at least 3 skills", onFix: edit("profile-skill-input") },
    { key: "experience", weight: 15, done: (profile.experiences || []).length > 0, suggestion: "Add your experience", onFix: edit("profile-add-experience") },
    { key: "education", weight: 10, done: !!profile.education, suggestion: "Add your education", onFix: edit("profile-education") },
    { key: "languages", weight: 10, done: (profile.languages || []).length > 0, suggestion: "Add the languages you speak", onFix: edit("profile-add-language") },
    { key: "cv", weight: 10, done: hasCv, suggestion: "Upload your CV", onFix: () => document.getElementById("profile-cv-input")?.focus() },
    { key: "links", weight: 5, done: LINKS.some(({ key }) => profile[key]), suggestion: "Add LinkedIn, GitHub or a portfolio", onFix: edit("profile-urlLinkedin") },
  ];
}

/** The API body for a save. */
export const toProfileRequest = (form) => ({
  headline: form.headline.trim(),
  education: form.education.trim(),
  bio: form.bio,
  picture: form.picture,
  urlLinkedin: normalizeUrl(form.urlLinkedin),
  urlGithub: normalizeUrl(form.urlGithub),
  urlPortfolio: normalizeUrl(form.urlPortfolio),
  skills: form.skills,
  languages: form.languages.map((l) => ({ language: l.language.trim(), level: l.level })),
  experiences: form.experiences.map((x) => ({
    position: x.position.trim(), company: x.company.trim(), startDate: x.startDate, endDate: x.endDate || null,
  })),
});

/** What "Draft my bio" sends: only what the user entered. */
export const toBioDraftRequest = (form) => ({
  headline: form.headline,
  skills: form.skills,
  education: form.education,
  languages: form.languages.filter((l) => l.language.trim())
    .map((l) => ({ language: l.language.trim(), level: levelLabel(l.level).split(" (")[0].toLowerCase() })),
  experiences: form.experiences.filter((e) => e.position && e.company)
    .map((e) => ({ ...e, endDate: e.endDate || null })),
});
