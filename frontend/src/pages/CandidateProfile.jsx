import { lazy, Suspense, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import candidateService from "../services/candidateService";
import aiService from "../services/aiService";
import AlertModal from "../components/AlertModal";
import Avatar from "../components/Avatar";
import { SkeletonCards } from "../components/Skeleton";
import { useToast } from "../components/toastContext";
import { MAX_FILE_SIZE_MB, validateFile } from "../utils/files";
import { DraftNote, Missing, ProfileCompleteness, SectionCard } from "../components/ProfileParts";
import { focusField, isValidUrl, normalizeUrl } from "../utils/profile";
import "../styles/profile.css";
import { formatDate, formatMonthYear } from "../utils/format";

// pdf.js is large: only loaded when a CV preview is shown.
const PdfPreview = lazy(() => import("../components/PdfPreview"));

const EMPTY_EXPERIENCE = { position: "", company: "", startDate: "", endDate: "" };
const EMPTY_LANGUAGE = { language: "", level: "PROFESSIONAL" };
// Same levels as the backend (LanguageLevel), shown with their CEFR equivalents.
const LANGUAGE_LEVELS = [
  { value: "NATIVE", label: "Native or bilingual" },
  { value: "FLUENT", label: "Fluent (C1–C2)" },
  { value: "PROFESSIONAL", label: "Professional (B2)" },
  { value: "INTERMEDIATE", label: "Intermediate (B1)" },
  { value: "BASIC", label: "Basic (A1–A2)" },
];
const levelLabel = (value) => LANGUAGE_LEVELS.find((l) => l.value === value)?.label || value;
const COMMON_LANGUAGES = ["Arabic", "English", "French", "German", "Italian", "Spanish", "Chinese", "Turkish", "Portuguese", "Russian"];
const LINKS = [
  { key: "urlLinkedin", label: "LinkedIn" },
  { key: "urlGithub", label: "GitHub" },
  { key: "urlPortfolio", label: "Portfolio" },
];

const toForm = (p) => ({
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

const formatMonth = (value) =>
  formatMonthYear(value);

function validate(form) {
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

export default function CandidateProfile() {
  const { setUser } = useOutletContext();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [cv, setCv] = useState(null);
  const [cvUrl, setCvUrl] = useState("");
  const [cvBlob, setCvBlob] = useState(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvError, setCvError] = useState("");

  // The stored CV and its preview; loadCv() loads them again after an upload.
  const [cvReloadKey, setCvReloadKey] = useState(0);
  const loadCv = () => setCvReloadKey((k) => k + 1);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const meta = await candidateService.getMyCv();
        if (!ignore) setCv(meta);
        if (meta.fileName?.toLowerCase().endsWith(".pdf")) {
          const blob = new Blob([await candidateService.getMyCvFile()], { type: "application/pdf" });
          if (!ignore) setCvBlob(blob);
          if (!ignore) setCvUrl(URL.createObjectURL(blob));
        } else {
          if (!ignore) setCvBlob(null);
          if (!ignore) setCvUrl("");
        }
      } catch (err) {
        if (err.response?.status !== 404) console.error(err);
        if (!ignore) setCv(null);
        if (!ignore) setCvBlob(null);
        if (!ignore) setCvUrl("");
      }
    })();
    return () => { ignore = true; };
  }, [cvReloadKey]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await candidateService.getProfile();
        if (!active) return;
        setProfile(data);
        setForm(toForm(data));
      } catch (err) {
        console.error(err);
        setErrorMsg("Your profile couldn't be loaded. Please refresh the page.");
      }
    })();
    return () => { active = false; };
  }, []);

  // The object URL of the CV preview is freed when it changes or the page closes.
  useEffect(() => () => { if (cvUrl) URL.revokeObjectURL(cvUrl); }, [cvUrl]);


  const handleCvChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const error = validateFile(file, [".pdf", ".docx"]);
    setCvError(error || "");
    if (error) return;
    setCvUploading(true);
    try {
      await candidateService.uploadMyCv(file);
      loadCv();
      toast("Your CV is updated. Match scores will use it from now on.");
    } catch (err) {
      setCvError(err.response?.data?.message || "Your CV couldn't be uploaded. Please try again.");
    } finally {
      setCvUploading(false);
    }
  };

  if (!profile || !form) {
    return (
      <div className="profile-page">
        {errorMsg ? <p className="text-muted">{errorMsg}</p> : <SkeletonCards count={3} />}
      </div>
    );
  }

  const errors = validate(form);
  const showError = (key) => submitted && errors[key];
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();

  const startEditing = () => {
    setForm(toForm(profile));
    setSubmitted(false);
    setDraft(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm(toForm(profile));
    setEditing(false);
    setDraft(null);
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !form.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setForm((f) => ({ ...f, skills: [...f.skills, skill] }));
    }
    setSkillInput("");
  };

  const updateExperience = (index, key, value) =>
    setForm((f) => ({ ...f, experiences: f.experiences.map((e, i) => (i === index ? { ...e, [key]: value } : e)) }));

  const handlePicture = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please choose an image (JPG or PNG).");
      return;
    }
    setUploadingPicture(true);
    try {
      const { url } = await candidateService.uploadFile(file);
      setForm((f) => ({ ...f, picture: url }));
    } catch (err) {
      console.error(err);
      setErrorMsg("Your photo couldn't be uploaded. Please try again.");
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleDraftBio = async () => {
    setDrafting(true);
    try {
      const result = await aiService.draftBio({
        headline: form.headline,
        skills: form.skills,
        education: form.education,
        languages: form.languages.filter((l) => l.language.trim())
          .map((l) => ({ language: l.language.trim(), level: levelLabel(l.level).split(" (")[0].toLowerCase() })),
        experiences: form.experiences.filter((e) => e.position && e.company)
          .map((e) => ({ ...e, endDate: e.endDate || null })),
      });
      setForm((f) => ({ ...f, bio: result.text }));
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
      const first = document.querySelector("[aria-invalid='true']");
      first?.focus();
      return;
    }
    setSaving(true);
    try {
      const updatedUser = await candidateService.updateBasicInfo({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      const updated = await candidateService.updateProfile({
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
      setProfile(updated);
      setForm(toForm(updated));
      setEditing(false);
      setDraft(null);
      setUser((prev) => ({ ...prev, firstName: updatedUser.firstName, lastName: updatedUser.lastName, candidateProfile: updated }));
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "null");
        if (stored) localStorage.setItem("user", JSON.stringify({ ...stored, firstName: updatedUser.firstName, lastName: updatedUser.lastName }));
      } catch { /* the layout copy is a convenience only */ }
      toast("Your profile is saved.");
    } catch (err) {
      const data = err.response?.data;
      setErrorMsg(data?.message || (data && typeof data === "object" ? Object.values(data).join(" ") : "") ||
        "Your profile couldn't be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const completeness = [
    { key: "picture", weight: 10, done: !!profile.picture, suggestion: "Add a profile photo", onFix: () => focusField(setEditing, "profile-picture") },
    { key: "headline", weight: 15, done: !!profile.headline, suggestion: "Add a headline (your job title)", onFix: () => focusField(setEditing, "profile-headline") },
    { key: "bio", weight: 10, done: (profile.bio || "").trim().length >= 40, suggestion: "Write a short bio", onFix: () => focusField(setEditing, "profile-bio") },
    { key: "skills", weight: 15, done: (profile.skills || []).length >= 3, suggestion: "List at least 3 skills", onFix: () => focusField(setEditing, "profile-skill-input") },
    { key: "experience", weight: 15, done: (profile.experiences || []).length > 0, suggestion: "Add your experience", onFix: () => focusField(setEditing, "profile-add-experience") },
    { key: "education", weight: 10, done: !!profile.education, suggestion: "Add your education", onFix: () => focusField(setEditing, "profile-education") },
    { key: "languages", weight: 10, done: (profile.languages || []).length > 0, suggestion: "Add the languages you speak", onFix: () => focusField(setEditing, "profile-add-language") },
    { key: "cv", weight: 10, done: !!cv, suggestion: "Upload your CV", onFix: () => document.getElementById("profile-cv-input")?.focus() },
    { key: "links", weight: 5, done: LINKS.some(({ key }) => profile[key]), suggestion: "Add LinkedIn, GitHub or a portfolio", onFix: () => focusField(setEditing, "profile-urlLinkedin") },
  ];

  const experiences = [...(profile.experiences || [])].sort((a, b) =>
    (a.endDate ? 1 : 0) - (b.endDate ? 1 : 0) || String(b.startDate).localeCompare(String(a.startDate)));

  const cvCard = (
    <SectionCard id="cv" title="My CV"
      action={
        <label className="secondary-btn btn-compact file-button">
          {cvUploading ? "Uploading…" : cv ? "Replace" : "Upload"}
          <input id="profile-cv-input" type="file" accept=".pdf,.docx" onChange={handleCvChange} disabled={cvUploading}
            aria-label={cv ? "Replace your CV (PDF or DOCX)" : "Upload your CV (PDF or DOCX)"} />
        </label>
      }>
      {cvError && <span className="field-error" role="alert">{cvError}</span>}
      {cv ? (
        <>
          <div className="cv-file">
            <span className="cv-file__icon" aria-hidden="true">{cv.fileName?.toLowerCase().endsWith(".pdf") ? "PDF" : "DOC"}</span>
            <div className="grow">
              <div className="text-strong truncate">{cv.fileName}</div>
              {cv.uploadedAt && <div className="hint">Uploaded {formatDate(cv.uploadedAt)}</div>}
            </div>
            {cvUrl && <a className="cv-link text-sm" href={cvUrl} target="_blank" rel="noreferrer">Open</a>}
          </div>
          {cvBlob ? (
            <Suspense fallback={<p className="hint">Loading the preview…</p>}>
              <PdfPreview data={cvBlob} title={`Preview of ${cv.fileName}`} />
            </Suspense>
          ) : (
            <p className="hint">The preview is available for PDF files. Your DOCX CV is used for matching as it is.</p>
          )}
        </>
      ) : (
        <Missing>No CV yet. Upload one (PDF or DOCX, max {MAX_FILE_SIZE_MB} MB) to see how well you match each offer.</Missing>
      )}
    </SectionCard>
  );

  return (
    <div className="profile-page page-stack">
      <header className="profile-hero">
        <Avatar src={editing ? form.picture : profile.picture} name={fullName} size="lg" />
        <div className="profile-hero__main">
          <h2 className="profile-hero__name">{fullName || "Your name"}</h2>
          {profile.headline
            ? <p className="profile-hero__tagline">{profile.headline}</p>
            : <p className="profile-hero__tagline profile-hero__tagline--empty">No headline yet</p>}
          <div className="profile-hero__meta">
            <span>{profile.email}</span>
            {LINKS.filter(({ key }) => profile[key]).map(({ key, label }) => (
              <a key={key} className="link-chip" href={profile[key]} target="_blank" rel="noreferrer">{label} ↗</a>
            ))}
          </div>
        </div>
        {!editing && (
          <div className="profile-hero__actions">
            <button type="button" className="primary-btn" onClick={startEditing}>Edit profile</button>
          </div>
        )}
      </header>

      {!editing ? (
        <div className="profile-layout">
          <div className="profile-column">
            <SectionCard id="about" title="About">
              {profile.bio ? <p className="profile-text">{profile.bio}</p> : <Missing>No bio yet.</Missing>}
            </SectionCard>

            <SectionCard id="experience" title="Experience">
              {experiences.length === 0 ? <Missing>No experience added yet.</Missing> : (
                <ol className="timeline">
                  {experiences.map((e, i) => (
                    <li key={e.id || i} className={`timeline__item ${e.endDate ? "" : "timeline__item--current"}`}>
                      <p className="timeline__title">{e.position}</p>
                      <p className="timeline__meta">
                        {e.company} · {formatMonth(e.startDate)} – {e.endDate ? formatMonth(e.endDate) : "present"}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>

            <SectionCard id="education" title="Education">
              {profile.education ? <p className="profile-text">{profile.education}</p> : <Missing>No education added yet.</Missing>}
            </SectionCard>

            {cvCard}
          </div>

          <aside className="profile-column profile-column--aside">
            <ProfileCompleteness items={completeness} />
            <SectionCard id="skills" title="Skills">
              {(profile.skills || []).length === 0 ? <Missing>No skills listed yet.</Missing> : (
                <ul className="tag-list">
                  {profile.skills.map((s) => <li key={s} className="tag">{s}</li>)}
                </ul>
              )}
            </SectionCard>
            <SectionCard id="languages" title="Languages">
              {(profile.languages || []).length === 0 ? <Missing>No languages listed yet.</Missing> : (
                <dl className="detail-list">
                  {profile.languages.map((l) => (
                    <div key={l.language}><dt>{l.language}</dt><dd>{levelLabel(l.level)}</dd></div>
                  ))}
                </dl>
              )}
            </SectionCard>
          </aside>
        </div>
      ) : (
        <form className="page-stack" onSubmit={handleSave} noValidate>
          <SectionCard id="edit-identity" title="Identity">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="profile-firstName">First name *</label>
                <input id="profile-firstName" value={form.firstName} onChange={set("firstName")} aria-invalid={!!showError("firstName")} />
                {showError("firstName") && <span className="field-error">{errors.firstName}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="profile-lastName">Last name *</label>
                <input id="profile-lastName" value={form.lastName} onChange={set("lastName")} aria-invalid={!!showError("lastName")} />
                {showError("lastName") && <span className="field-error">{errors.lastName}</span>}
              </div>
              <div className="form-group form-full-width">
                <label htmlFor="profile-headline">Headline <span className="char-count">{form.headline.length}/150</span></label>
                <input id="profile-headline" placeholder="e.g. Java backend developer" value={form.headline}
                  onChange={set("headline")} aria-invalid={!!showError("headline")} />
                <span className="field-hint">Your current or target job title. Recruiters see it first.</span>
                {showError("headline") && <span className="field-error">{errors.headline}</span>}
              </div>
              <div className="form-group form-full-width">
                <label htmlFor="profile-picture">Profile photo</label>
                <input id="profile-picture" type="file" accept="image/*" className="file-input" onChange={handlePicture} />
                {uploadingPicture && <span className="field-hint">Uploading…</span>}
              </div>
            </div>
          </SectionCard>

          <SectionCard id="edit-bio" title="About"
            action={
              <button type="button" className="accent-btn accent-violet btn-compact" onClick={handleDraftBio} disabled={drafting}>
                {drafting ? "Drafting…" : "Draft my bio"}
              </button>
            }>
            <div className="form-group">
              <label htmlFor="profile-bio">Bio <span className="char-count">{form.bio.length}/2000</span></label>
              <textarea id="profile-bio" rows="6" value={form.bio} onChange={set("bio")} aria-invalid={!!showError("bio")}
                placeholder="A few sentences about what you do and what you're looking for." />
              {showError("bio") && <span className="field-error">{errors.bio}</span>}
              <span className="field-hint">"Draft my bio" writes a starting point from your headline, experience, skills and education only.</span>
              <DraftNote draft={draft} />
            </div>
          </SectionCard>

          <SectionCard id="edit-skills" title="Skills">
            <div className="tag-input">
              <input id="profile-skill-input" placeholder="Add a skill, then press Enter" value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                aria-label="New skill" />
              <button type="button" className="secondary-btn" onClick={addSkill}>Add</button>
            </div>
            {form.skills.length > 0 && (
              <ul className="tag-list">
                {form.skills.map((s) => (
                  <li key={s} className="tag">
                    {s}
                    <button type="button" className="tag__remove" aria-label={`Remove ${s}`}
                      onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }))}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard id="edit-experience" title="Experience"
            action={
              <button id="profile-add-experience" type="button" className="secondary-btn btn-compact"
                onClick={() => setForm((f) => ({ ...f, experiences: [...f.experiences, { ...EMPTY_EXPERIENCE }] }))}>
                + Add experience
              </button>
            }>
            {form.experiences.length === 0 ? <Missing>No experience yet.</Missing> : (
              <div className="experience-editor">
                {form.experiences.map((x, i) => (
                  <div key={i}>
                    <div className="experience-row">
                      <div className="form-group">
                        <label htmlFor={`exp-position-${i}`}>Position *</label>
                        <input id={`exp-position-${i}`} value={x.position} onChange={(e) => updateExperience(i, "position", e.target.value)}
                          aria-invalid={!!showError(`experience-${i}`)} />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`exp-company-${i}`}>Company *</label>
                        <input id={`exp-company-${i}`} value={x.company} onChange={(e) => updateExperience(i, "company", e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`exp-start-${i}`}>Start *</label>
                        <input id={`exp-start-${i}`} type="date" value={x.startDate} onChange={(e) => updateExperience(i, "startDate", e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`exp-end-${i}`}>End (empty = current)</label>
                        <input id={`exp-end-${i}`} type="date" value={x.endDate} onChange={(e) => updateExperience(i, "endDate", e.target.value)} />
                      </div>
                      <button type="button" className="icon-button" aria-label={`Remove experience ${x.position || i + 1}`}
                        onClick={() => setForm((f) => ({ ...f, experiences: f.experiences.filter((_, j) => j !== i) }))}>×</button>
                    </div>
                    {showError(`experience-${i}`) && <span className="field-error">{errors[`experience-${i}`]}</span>}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard id="edit-languages" title="Languages"
            action={
              <button id="profile-add-language" type="button" className="secondary-btn btn-compact"
                onClick={() => setForm((f) => ({ ...f, languages: [...f.languages, { ...EMPTY_LANGUAGE }] }))}>
                + Add language
              </button>
            }>
            {form.languages.length === 0 ? <Missing>No languages yet.</Missing> : (
              <div className="experience-editor">
                <datalist id="common-languages">
                  {COMMON_LANGUAGES.map((l) => <option key={l} value={l} />)}
                </datalist>
                {form.languages.map((l, i) => (
                  <div key={i}>
                    <div className="language-row">
                      <div className="form-group">
                        <label htmlFor={`lang-name-${i}`}>Language *</label>
                        <input id={`lang-name-${i}`} list="common-languages" value={l.language}
                          aria-invalid={!!showError(`language-${i}`)}
                          onChange={(e) => setForm((f) => ({ ...f, languages: f.languages.map((x, j) => (j === i ? { ...x, language: e.target.value } : x)) }))} />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`lang-level-${i}`}>Level</label>
                        <select id={`lang-level-${i}`} value={l.level}
                          onChange={(e) => setForm((f) => ({ ...f, languages: f.languages.map((x, j) => (j === i ? { ...x, level: e.target.value } : x)) }))}>
                          {LANGUAGE_LEVELS.map((lv) => <option key={lv.value} value={lv.value}>{lv.label}</option>)}
                        </select>
                      </div>
                      <button type="button" className="icon-button" aria-label={`Remove ${l.language || "this language"}`}
                        onClick={() => setForm((f) => ({ ...f, languages: f.languages.filter((_, j) => j !== i) }))}>×</button>
                    </div>
                    {showError(`language-${i}`) && <span className="field-error">{errors[`language-${i}`]}</span>}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard id="edit-education" title="Education">
            <div className="form-group">
              <label htmlFor="profile-education">Degrees and schools <span className="char-count">{form.education.length}/1000</span></label>
              <textarea id="profile-education" rows="3" value={form.education} onChange={set("education")}
                aria-invalid={!!showError("education")} placeholder="e.g. Master in software engineering, ENICAR (2024)" />
              {showError("education") && <span className="field-error">{errors.education}</span>}
            </div>
          </SectionCard>

          <SectionCard id="edit-links" title="Links">
            <div className="form-grid">
              {LINKS.map(({ key, label }) => (
                <div key={key} className="form-group">
                  <label htmlFor={`profile-${key}`}>{label}</label>
                  <input id={`profile-${key}`} inputMode="url" value={form[key]} onChange={set(key)}
                    placeholder={`${label.toLowerCase()}.com/…`} aria-invalid={!!showError(key)} />
                  {showError(key) && <span className="field-error">{errors[key]}</span>}
                </div>
              ))}
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
