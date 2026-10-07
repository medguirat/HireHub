import { DraftNote, SectionCard } from "../../components/ProfileParts";
import { IMAGE_TYPES } from "../../services/fileService";
import { ExperienceEditor, LanguagesEditor, SkillsEditor } from "./ListEditors";
import { LINKS } from "./model";

/** The profile in edit mode. Errors show once the user has tried to save (`submitted`). */
export default function ProfileForm({
  form, setForm, errors, submitted, saving, onSubmit, onCancel,
  onPicture, uploadingPicture, onDraftBio, drafting, draft,
}) {
  const showError = (key) => submitted && errors[key];
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form className="page-stack" onSubmit={onSubmit} noValidate>
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
            <input id="profile-picture" type="file" accept={IMAGE_TYPES} className="file-input" onChange={onPicture} />
            {uploadingPicture && <span className="field-hint">Uploading…</span>}
          </div>
        </div>
      </SectionCard>

      <SectionCard id="edit-bio" title="About"
        action={
          <button type="button" className="accent-btn accent-violet btn-compact" onClick={onDraftBio} disabled={drafting}>
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

      <SkillsEditor skills={form.skills} setForm={setForm} />
      <ExperienceEditor experiences={form.experiences} setForm={setForm} showError={showError} errors={errors} />
      <LanguagesEditor languages={form.languages} setForm={setForm} showError={showError} errors={errors} />

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
        <button type="button" className="secondary-btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
      </div>
    </form>
  );
}
