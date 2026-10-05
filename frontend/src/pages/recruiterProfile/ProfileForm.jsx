import { DraftNote, SectionCard } from "../../components/ProfileParts";
import { IMAGE_TYPES } from "../../services/fileService";
import { DESCRIPTION_MAX, SOCIALS, URL_FIELDS } from "./model";

/** "From your website" next to a field the import filled, until the user edits it. */
function FromWebsite({ name, autoFilled }) {
  return autoFilled.has(name)
    ? <span className="autofill-tag" title="Filled automatically from your website. Please check it.">From your website</span>
    : null;
}

/** One labelled input or textarea of the company form, with its hint and error. */
function CompanyField({ name, label, form, onChange, showError, errors, autoFilled,
  type = "text", textarea = false, placeholder, rows = 3, full = false, required = false, hint }) {
  return (
    <div className={`form-group ${full ? "form-full-width" : ""}`}>
      <label htmlFor={`company-${name}`}>{label}{required && " *"}<FromWebsite name={name} autoFilled={autoFilled} /></label>
      {textarea ? (
        <textarea id={`company-${name}`} rows={rows} value={form[name]} onChange={onChange(name)}
          placeholder={placeholder} aria-invalid={!!showError(name)} />
      ) : (
        <input id={`company-${name}`} type={type} value={form[name]} onChange={onChange(name)}
          placeholder={placeholder} aria-invalid={!!showError(name)}
          inputMode={URL_FIELDS.includes(name) ? "url" : undefined} />
      )}
      {hint && <span className="field-hint">{hint}</span>}
      {showError(name) && <span className="field-error">{errors[name]}</span>}
    </div>
  );
}

/** The company profile in edit mode. Errors show once the user has tried to save (`submitted`). */
export default function ProfileForm({
  form, setForm, basic, setBasic, errors, submitted, saving, onSubmit, onCancel,
  companyImport, onImport, onLogo, uploadingLogo, onDraftDescription, drafting, draft,
}) {
  const { autoFilled, unmark, status: importStatus, starting: startingImport } = companyImport;
  const showError = (key) => submitted && errors[key];
  const setField = (name) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
    unmark(name);
  };
  const shared = { form, onChange: setField, showError, errors, autoFilled };

  return (
    <form className="page-stack" onSubmit={onSubmit} noValidate>
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
          <CompanyField name="companyName" label="Company name" required {...shared} />
          <div className="form-group">
            <label htmlFor="company-website">Website *<FromWebsite name="website" autoFilled={autoFilled} /></label>
            <input id="company-website" inputMode="url" value={form.website} onChange={setField("website")}
              placeholder="www.yourcompany.com" aria-invalid={!!showError("website")} />
            {showError("website") && <span className="field-error">{errors.website}</span>}
            {importStatus !== "IN_PROGRESS" && importStatus !== "FAILED" && form.website.trim() && (
              <button type="button" className="link-btn" onClick={onImport} disabled={startingImport}
                title="Fills the empty fields below with what your website says">
                {startingImport ? "Starting…" : "Fill empty fields from this website"}
              </button>
            )}
          </div>
          <div className="form-group form-full-width">
            <label htmlFor="company-logo">Logo<FromWebsite name="logo" autoFilled={autoFilled} /></label>
            <input id="company-logo" type="file" accept={IMAGE_TYPES} className="file-input" onChange={onLogo} />
            {uploadingLogo && <span className="field-hint">Uploading…</span>}
          </div>
          <div className="form-group form-full-width">
            <label htmlFor="company-description">
              Description<FromWebsite name="description" autoFilled={autoFilled} />
              <span className="char-count">{form.description.length}/{DESCRIPTION_MAX}</span>
            </label>
            <textarea id="company-description" rows="7" value={form.description} onChange={setField("description")}
              placeholder="What your company does, for whom, and what it's like to work there."
              aria-invalid={!!showError("description")} />
            {showError("description") && <span className="field-error">{errors.description}</span>}
            <div className="row">
              <button type="button" className="accent-btn accent-violet btn-compact" onClick={onDraftDescription} disabled={drafting}>
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
          <CompanyField name="industry" label="Industry" placeholder="e.g. Banking software" {...shared} />
          <CompanyField name="companyType" label="Company type" placeholder="e.g. Software publisher, startup, agency" {...shared} />
          <CompanyField name="foundedYear" label="Founded" placeholder="e.g. 2006" hint="A year like 2006." {...shared} />
          <CompanyField name="companySize" label="Company size" placeholder="e.g. 51-200 employees" {...shared} />
          <CompanyField name="headquarters" label="Headquarters" placeholder="e.g. Sousse, Tunisia" {...shared} />
          <CompanyField name="googleMapsUrl" label="Google Maps link" placeholder="maps.google.com/…" {...shared} />
          <CompanyField name="offices" label="Other offices" textarea full placeholder="e.g. Paris, Dubai" {...shared} />
        </div>
      </SectionCard>

      <SectionCard id="edit-culture" title="Mission, vision and values">
        <div className="form-grid">
          <CompanyField name="mission" label="Mission" textarea full {...shared} />
          <CompanyField name="vision" label="Vision" textarea full {...shared} />
          <CompanyField name="companyValues" label="Values" textarea full placeholder="e.g. Commitment, transparency, teamwork" {...shared} />
        </div>
      </SectionCard>

      <SectionCard id="edit-tech" title="Technologies">
        <CompanyField name="technologies" label="Technologies you use" placeholder="Comma-separated, e.g. Java, React, AWS"
          hint="Shown as tags on your profile." {...shared} />
      </SectionCard>

      <SectionCard id="edit-contact" title="Contact and social">
        <div className="form-grid">
          <CompanyField name="phone" label="Phone" placeholder="e.g. +216 73 000 000" {...shared} />
          {SOCIALS.map(({ key, label }) => (
            <div key={key} className="contents">
              <CompanyField name={key} label={label} placeholder={`${label.split(" ")[0].toLowerCase()}.com/…`} {...shared} />
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
