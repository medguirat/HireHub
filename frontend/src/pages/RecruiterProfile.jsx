import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import aiService from "../services/aiService";
import AlertModal from "../components/AlertModal";
import Avatar from "../components/Avatar";
import { SkeletonCards } from "../components/Skeleton";
import { useToast } from "../components/toastContext";
import { DraftNote, Missing, ProfileCompleteness, SectionCard } from "../components/ProfileParts";
import { focusField, isValidUrl, normalizeUrl } from "../utils/profile";
import "../styles/profile.css";
import { errorMessage } from "../utils/apiError";

const COMPANY_FIELDS = [
  "companyName", "website", "logo", "description", "foundedYear", "industry", "mission", "vision",
  "companyValues", "googleMapsUrl", "headquarters", "offices", "companySize", "companyType",
  "technologies", "phone", "linkedin", "facebook", "instagram", "twitter"
];
const URL_FIELDS = ["website", "googleMapsUrl", "linkedin", "facebook", "instagram", "twitter"];
const SOCIALS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "X / Twitter" },
];
const IMPORT_POLL_MS = 3000;
const DESCRIPTION_MAX = 5000;

const toCompanyForm = (profile) =>
  Object.fromEntries(COMPANY_FIELDS.map((f) => [f, profile[f] ?? ""]));

const splitList = (value) => (value || "").split(",").map((s) => s.trim()).filter(Boolean);

function validate(form, basic) {
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

export default function RecruiterProfile() {
  const { setUser } = useOutletContext();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [basic, setBasic] = useState({ firstName: "", lastName: "" });
  const [editing, setEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Company details imported from the website (at signup or on request).
  const [importStatus, setImportStatus] = useState("NOT_REQUESTED");
  const [importMessage, setImportMessage] = useState("");
  const [autoFilled, setAutoFilled] = useState(() => new Set());
  const [startingImport, setStartingImport] = useState(false);

  const applyImportState = useCallback((p) => {
    setImportStatus(p.companyImportStatus || "NOT_REQUESTED");
    setImportMessage(p.companyImportMessage || "");
    setAutoFilled(new Set(p.autoFilledFields || []));
  }, []);

  const applyProfile = useCallback((p) => {
    setProfile(p);
    setForm(toCompanyForm(p));
    setBasic({ firstName: p.firstName || "", lastName: p.lastName || "" });
    applyImportState(p);
  }, [applyImportState]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await recruiterService.getProfile();
        if (!active) return;
        applyProfile(p);
        setUser((prev) => ({ ...prev, recruiterProfile: p }));
      } catch (err) {
        console.error(err);
        setErrorMsg("Your company profile couldn't be loaded. Please refresh the page.");
      }
    })();
    return () => { active = false; };
  }, [setUser, applyProfile]);

  useEffect(() => {
    if (importStatus !== "IN_PROGRESS") return undefined;
    const timer = setInterval(async () => {
      try {
        const p = await recruiterService.getProfile();
        if (p.companyImportStatus === "IN_PROGRESS") return;
        setProfile(p);
        // Don't overwrite anything typed while the import was running.
        setForm((prev) => {
          const next = { ...prev };
          for (const field of p.autoFilledFields || []) {
            if (next[field] === "" || next[field] == null) next[field] = p[field] ?? "";
          }
          return next;
        });
        applyImportState(p);
      } catch (err) {
        console.error("Failed to refresh the company import status:", err);
      }
    }, IMPORT_POLL_MS);
    return () => clearInterval(timer);
  }, [importStatus, applyImportState]);

  if (!profile || !form) {
    return (
      <div className="profile-page">
        {errorMsg ? <p className="text-muted">{errorMsg}</p> : <SkeletonCards count={3} />}
      </div>
    );
  }

  const errors = validate(form, basic);
  const showError = (key) => submitted && errors[key];

  const unmark = (name) => setAutoFilled((prev) => {
    if (!prev.has(name)) return prev;
    const next = new Set(prev);
    next.delete(name);
    return next;
  });

  const setField = (name) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
    unmark(name);
  };

  const fromWebsite = (name) =>
    autoFilled.has(name) && (
      <span className="autofill-tag" title="Filled automatically from your website. Please check it.">From your website</span>
    );

  const field = (name, label, { type = "text", textarea = false, placeholder, rows = 3, full = false, required = false, hint } = {}) => (
    <div className={`form-group ${full ? "form-full-width" : ""}`}>
      <label htmlFor={`company-${name}`}>{label}{required && " *"}{fromWebsite(name)}</label>
      {textarea ? (
        <textarea id={`company-${name}`} rows={rows} value={form[name]} onChange={setField(name)}
          placeholder={placeholder} aria-invalid={!!showError(name)} />
      ) : (
        <input id={`company-${name}`} type={type} value={form[name]} onChange={setField(name)}
          placeholder={placeholder} aria-invalid={!!showError(name)}
          inputMode={URL_FIELDS.includes(name) ? "url" : undefined} />
      )}
      {hint && <span className="field-hint">{hint}</span>}
      {showError(name) && <span className="field-error">{errors[name]}</span>}
    </div>
  );

  const startEditing = () => {
    setForm(toCompanyForm(profile));
    setBasic({ firstName: profile.firstName || "", lastName: profile.lastName || "" });
    setAutoFilled(new Set(profile.autoFilledFields || []));
    setSubmitted(false);
    setDraft(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm(toCompanyForm(profile));
    setAutoFilled(new Set(profile.autoFilledFields || []));
    setDraft(null);
    setEditing(false);
  };

  const handleImportFromWebsite = async () => {
    setStartingImport(true);
    try {
      const p = await recruiterService.importCompanyFromWebsite(normalizeUrl(form.website) || profile.website);
      applyImportState(p);
      setForm((prev) => ({ ...prev, website: p.website || prev.website }));
    } catch (err) {
      console.error(err);
      setErrorMsg(errorMessage(err, "We couldn't start the import. Please try again."));
    } finally {
      setStartingImport(false);
    }
  };

  const handleLogo = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please choose an image (PNG, JPG or SVG).");
      return;
    }
    setUploadingLogo(true);
    try {
      const { url } = await recruiterService.uploadFile(file);
      setForm((prev) => ({ ...prev, logo: url }));
      unmark("logo");
    } catch (err) {
      console.error(err);
      setErrorMsg("The logo couldn't be uploaded. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDraftDescription = async () => {
    setDrafting(true);
    try {
      const fields = ["companyName", "companyType", "industry", "headquarters", "offices", "foundedYear",
        "companySize", "mission", "vision", "companyValues", "technologies"];
      const result = await aiService.draftCompanyDescription({
        ...Object.fromEntries(fields.map((f) => [f, String(form[f] ?? "")])),
        // The website's own words, only while they are still the imported text.
        websiteDescription: autoFilled.has("description") ? form.description : "",
      });
      setForm((prev) => ({ ...prev, description: result.text }));
      unmark("description");
      setDraft(result);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setDrafting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      document.querySelector("[aria-invalid='true']")?.focus();
      return;
    }
    setSaving(true);
    try {
      const updatedUser = await recruiterService.updateBasicInfo({
        firstName: basic.firstName.trim(), lastName: basic.lastName.trim(),
      });
      const payload = { ...form, foundedYear: String(form.foundedYear).trim() ? parseInt(form.foundedYear, 10) : null };
      URL_FIELDS.forEach((key) => { payload[key] = normalizeUrl(form[key]); });
      const updated = await recruiterService.updateProfile(payload);
      applyProfile(updated);
      setEditing(false);
      setDraft(null);
      setUser((prev) => ({ ...prev, firstName: updatedUser.firstName, lastName: updatedUser.lastName, recruiterProfile: updated }));
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "null");
        if (stored) {
          localStorage.setItem("user", JSON.stringify({
            ...stored, firstName: updatedUser.firstName, lastName: updatedUser.lastName,
            recruiterProfile: { companyName: updated.companyName, logo: updated.logo, headquarters: updated.headquarters },
          }));
        }
      } catch { /* the layout copy is a convenience only */ }
      toast("Your company profile is saved.");
    } catch (err) {
      setErrorMsg(errorMessage(err, "Your company profile couldn't be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const p = profile;
  const edit = (id) => () => focusField(setEditing, id);
  const completeness = [
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

  const tagline = [p.industry, p.headquarters].filter(Boolean).join(" · ");
  const facts = [
    ["Industry", p.industry], ["Company type", p.companyType], ["Founded", p.foundedYear],
    ["Size", p.companySize], ["Headquarters", p.headquarters], ["Other offices", p.offices],
  ].filter(([, v]) => v);

  const importBanner = (
    <>
      {importStatus === "IN_PROGRESS" && (
        <div className="import-banner import-banner--progress" role="status">
          <span className="import-spinner" aria-hidden="true" />
          <div>
            <strong>We're building your company profile from your website…</strong>
            <p>This usually takes a few seconds. You can keep editing: only empty fields will be filled.</p>
          </div>
        </div>
      )}
      {importStatus === "COMPLETED" && importMessage && (
        <div className="import-banner" role="status">
          <div>
            <strong>{importMessage}</strong>
            {autoFilled.size > 0 && <p>Imported fields are marked “From your website” until you edit them.</p>}
          </div>
        </div>
      )}
      {importStatus === "FAILED" && (
        <div className="import-banner import-banner--failed" role="alert">
          <div><strong>{importMessage || "We couldn't import your company details."}</strong></div>
          {(form.website || p.website) && (
            <button type="button" className="secondary-btn" onClick={handleImportFromWebsite} disabled={startingImport}>
              {startingImport ? "Starting…" : "Try again"}
            </button>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="profile-page page-stack">
      <header className="profile-hero">
        <Avatar src={editing ? form.logo : p.logo} name={p.companyName || "Company"} size="lg" shape="rounded" />
        <div className="profile-hero__main">
          <h2 className="profile-hero__name">{p.companyName || "Your company"}</h2>
          {tagline
            ? <p className="profile-hero__tagline">{tagline}</p>
            : <p className="profile-hero__tagline profile-hero__tagline--empty">Industry and location not set</p>}
          <div className="profile-hero__meta">
            <span>Recruiter: {`${p.firstName || ""} ${p.lastName || ""}`.trim()}</span>
            {p.website && <a className="link-chip" href={p.website} target="_blank" rel="noreferrer">{p.website.replace(/^https?:\/\//, "")} ↗</a>}
          </div>
        </div>
        {!editing && (
          <div className="profile-hero__actions">
            <button type="button" className="primary-btn" onClick={startEditing}>Edit profile</button>
          </div>
        )}
      </header>

      {importBanner}

      {!editing ? (
        <div className="profile-layout">
          <div className="profile-column">
            <SectionCard id="about" title={`About ${p.companyName || "the company"}`}>
              {p.description ? <p className="profile-text">{p.description}</p> : <Missing>No description yet. Candidates see this on your offers.</Missing>}
            </SectionCard>

            <SectionCard id="culture" title="Mission, vision and values">
              {!(p.mission || p.vision || p.companyValues) ? <Missing>Not shared yet.</Missing> : (
                <div>
                  {[["Mission", p.mission], ["Vision", p.vision], ["Values", p.companyValues]].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} className="labelled-block">
                      <h3>{label}</h3>
                      <p className="profile-text">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard id="tech" title="Technologies">
              {splitList(p.technologies).length === 0 ? <Missing>No technologies listed yet.</Missing> : (
                <ul className="tag-list">
                  {splitList(p.technologies).map((t) => <li key={t} className="tag">{t}</li>)}
                </ul>
              )}
            </SectionCard>
          </div>

          <aside className="profile-column profile-column--aside">
            <ProfileCompleteness items={completeness} title="Company profile completeness" />

            <SectionCard id="facts" title="Company facts">
              {facts.length === 0 ? <Missing>No details yet.</Missing> : (
                <dl className="detail-list">
                  {facts.map(([label, value]) => (
                    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                  ))}
                </dl>
              )}
            </SectionCard>

            <SectionCard id="contact" title="Contact">
              {!(p.phone || p.googleMapsUrl || SOCIALS.some(({ key }) => p[key])) ? <Missing>No contact details yet.</Missing> : (
                <div className="stack">
                  {p.phone && <a className="cv-link" href={`tel:${p.phone.replace(/\s+/g, "")}`}>{p.phone}</a>}
                  {p.googleMapsUrl && <a className="cv-link" href={p.googleMapsUrl} target="_blank" rel="noreferrer">See on Google Maps ↗</a>}
                  <div className="row">
                    {SOCIALS.filter(({ key }) => p[key]).map(({ key, label }) => (
                      <a key={key} className="link-chip" href={p[key]} target="_blank" rel="noreferrer">{label} ↗</a>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          </aside>
        </div>
      ) : (
        <form className="page-stack" onSubmit={handleSave} noValidate>
          <SectionCard id="edit-rep" title="You">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="rep-firstName">First name *</label>
                <input id="rep-firstName" value={basic.firstName} aria-invalid={!!showError("firstName")}
                  onChange={(e) => setBasic((b) => ({ ...b, firstName: e.target.value }))} />
                {showError("firstName") && <span className="field-error">{errors.firstName}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="rep-lastName">Last name *</label>
                <input id="rep-lastName" value={basic.lastName} aria-invalid={!!showError("lastName")}
                  onChange={(e) => setBasic((b) => ({ ...b, lastName: e.target.value }))} />
                {showError("lastName") && <span className="field-error">{errors.lastName}</span>}
              </div>
            </div>
          </SectionCard>

          <SectionCard id="edit-company" title="Company">
            <div className="form-grid">
              {field("companyName", "Company name", { required: true })}
              <div className="form-group">
                <label htmlFor="company-website">Website *{fromWebsite("website")}</label>
                <input id="company-website" inputMode="url" value={form.website} onChange={setField("website")}
                  placeholder="www.yourcompany.com" aria-invalid={!!showError("website")} />
                {showError("website") && <span className="field-error">{errors.website}</span>}
                {importStatus !== "IN_PROGRESS" && importStatus !== "FAILED" && form.website.trim() && (
                  <button type="button" className="link-btn" onClick={handleImportFromWebsite} disabled={startingImport}
                    title="Fills the empty fields below with what your website says">
                    {startingImport ? "Starting…" : "Fill empty fields from this website"}
                  </button>
                )}
              </div>
              <div className="form-group form-full-width">
                <label htmlFor="company-logo">Logo{fromWebsite("logo")}</label>
                <input id="company-logo" type="file" accept="image/*" className="file-input" onChange={handleLogo} />
                {uploadingLogo && <span className="field-hint">Uploading…</span>}
              </div>
              <div className="form-group form-full-width">
                <label htmlFor="company-description">
                  Description{fromWebsite("description")}
                  <span className="char-count">{form.description.length}/{DESCRIPTION_MAX}</span>
                </label>
                <textarea id="company-description" rows="7" value={form.description} onChange={setField("description")}
                  placeholder="What your company does, for whom, and what it's like to work there."
                  aria-invalid={!!showError("description")} />
                {showError("description") && <span className="field-error">{errors.description}</span>}
                <div className="row">
                  <button type="button" className="accent-btn accent-violet btn-compact" onClick={handleDraftDescription} disabled={drafting}>
                    {drafting ? "Drafting…" : "Draft a description"}
                  </button>
                  <span className="field-hint">Uses only the details on this page{autoFilled.has("description") ? " and the text imported from your website" : ""}.</span>
                </div>
                <DraftNote draft={draft} />
              </div>
            </div>
          </SectionCard>

          <SectionCard id="edit-details" title="Details">
            <div className="form-grid">
              {field("industry", "Industry", { placeholder: "e.g. Banking software" })}
              {field("companyType", "Company type", { placeholder: "e.g. Software publisher, startup, agency" })}
              {field("foundedYear", "Founded", { placeholder: "e.g. 2006", hint: "A year like 2006." })}
              {field("companySize", "Company size", { placeholder: "e.g. 51-200 employees" })}
              {field("headquarters", "Headquarters", { placeholder: "e.g. Sousse, Tunisia" })}
              {field("googleMapsUrl", "Google Maps link", { placeholder: "maps.google.com/…" })}
              {field("offices", "Other offices", { textarea: true, full: true, placeholder: "e.g. Paris, Dubai" })}
            </div>
          </SectionCard>

          <SectionCard id="edit-culture" title="Mission, vision and values">
            <div className="form-grid">
              {field("mission", "Mission", { textarea: true, full: true })}
              {field("vision", "Vision", { textarea: true, full: true })}
              {field("companyValues", "Values", { textarea: true, full: true, placeholder: "e.g. Commitment, transparency, teamwork" })}
            </div>
          </SectionCard>

          <SectionCard id="edit-tech" title="Technologies">
            {field("technologies", "Technologies you use", { placeholder: "Comma-separated, e.g. Java, React, AWS", hint: "Shown as tags on your profile." })}
          </SectionCard>

          <SectionCard id="edit-contact" title="Contact and social">
            <div className="form-grid">
              {field("phone", "Phone", { placeholder: "e.g. +216 73 000 000" })}
              {SOCIALS.map(({ key, label }) => <div key={key} className="contents">{field(key, label, { placeholder: `${label.split(" ")[0].toLowerCase()}.com/…` })}</div>)}
            </div>
          </SectionCard>

          <div className="edit-actions">
            <button type="button" className="secondary-btn" onClick={cancelEditing} disabled={saving}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
          </div>
        </form>
      )}

      <AlertModal isOpen={!!errorMsg} type="error" title="Something went wrong" message={errorMsg} onClose={() => setErrorMsg("")} />
    </div>
  );
}
