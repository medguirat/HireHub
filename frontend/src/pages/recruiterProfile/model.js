// The company profile's form model: field lists, conversion from and to the API, validation and
// the completeness checklist. No React here, so it can be tested on its own.
import { focusField, isValidUrl, normalizeUrl } from "../../utils/profile";

export const COMPANY_FIELDS = [
  "companyName", "website", "logo", "description", "foundedYear", "industry", "mission", "vision",
  "companyValues", "googleMapsUrl", "headquarters", "offices", "companySize", "companyType",
  "technologies", "phone", "linkedin", "facebook", "instagram", "twitter"
];
export const URL_FIELDS = ["website", "googleMapsUrl", "linkedin", "facebook", "instagram", "twitter"];
export const SOCIALS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "X / Twitter" },
];
export const DESCRIPTION_MAX = 5000;

export const toCompanyForm = (profile) =>
  Object.fromEntries(COMPANY_FIELDS.map((f) => [f, profile[f] ?? ""]));

export const splitList = (value) => (value || "").split(",").map((s) => s.trim()).filter(Boolean);

/** Field key -> message, for every problem in the form (empty when it can be saved). */
export function validate(form, basic) {
  const errors = {};
  if (!basic.firstName.trim()) errors.firstName = "Your first name is required.";
  if (!basic.lastName.trim()) errors.lastName = "Your last name is required.";
  if (!form.companyName.trim()) errors.companyName = "The company name is required.";
  if (!form.website.trim()) errors.website = "The company website is required.";
  URL_FIELDS.forEach((key) => {
    if (!errors[key] && !isValidUrl(form[key])) errors[key] = "This doesn't look like a web address.";
  });
  if (form.description.length > DESCRIPTION_MAX) errors.description = `At most ${DESCRIPTION_MAX} characters.`;
  const year = String(form.foundedYear).trim();
  if (year && (!/^\d{4}$/.test(year) || Number(year) < 1800 || Number(year) > new Date().getFullYear())) {
    errors.foundedYear = "Enter a year like 2006.";
  }
  return errors;
}

/** What the company profile still lacks, each with a weight and a way to fix it. */
export function completenessItems(p, setEditing) {
  const edit = (id) => () => focusField(setEditing, id);
  return [
    { key: "logo", weight: 10, done: !!p.logo, suggestion: "Add your company logo", onFix: edit("company-logo") },
    { key: "description", weight: 20, done: (p.description || "").trim().length >= 80, suggestion: "Describe your company", onFix: edit("company-description") },
    { key: "industry", weight: 10, done: !!p.industry, suggestion: "Add your industry", onFix: edit("company-industry") },
    { key: "headquarters", weight: 10, done: !!p.headquarters, suggestion: "Add your headquarters", onFix: edit("company-headquarters") },
    { key: "size", weight: 5, done: !!p.companySize, suggestion: "Add your company size", onFix: edit("company-companySize") },
    { key: "founded", weight: 5, done: !!p.foundedYear, suggestion: "Add the year you were founded", onFix: edit("company-foundedYear") },
    { key: "culture", weight: 15, done: !!(p.mission || p.vision || p.companyValues), suggestion: "Share your mission, vision or values", onFix: edit("company-mission") },
    { key: "tech", weight: 10, done: !!p.technologies, suggestion: "List the technologies you use", onFix: edit("company-technologies") },
    { key: "contact", weight: 10, done: !!(p.phone || SOCIALS.some(({ key }) => p[key])), suggestion: "Add a phone number or social link", onFix: edit("company-phone") },
    { key: "type", weight: 5, done: !!p.companyType, suggestion: "Add your company type", onFix: edit("company-companyType") },
  ];
}

/** The API body for a save. */
export function toProfileRequest(form) {
  const payload = { ...form, foundedYear: String(form.foundedYear).trim() ? parseInt(form.foundedYear, 10) : null };
  URL_FIELDS.forEach((key) => { payload[key] = normalizeUrl(form[key]); });
  return payload;
}

/**
 * What "Draft a description" sends: only the details on the page, plus the website's own words
 * while they are still the imported text.
 */
export function toDescriptionDraftRequest(form, autoFilled) {
  const fields = ["companyName", "companyType", "industry", "headquarters", "offices", "foundedYear",
    "companySize", "mission", "vision", "companyValues", "technologies"];
  return {
    ...Object.fromEntries(fields.map((f) => [f, String(form[f] ?? "")])),
    websiteDescription: autoFilled.has("description") ? form.description : "",
  };
}
