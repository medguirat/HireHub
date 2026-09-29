import { useState } from "react";

// yyyy-mm-dd in the user's own time zone (toISOString would use UTC).
const localDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Same rules as the backend's JobOfferRequestDto, checked before sending.
export function validateOffer(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = "Give the offer a title.";
  if (!form.description.trim()) errors.description = "Describe the role and what you expect from candidates.";
  if (!form.location.trim()) errors.location = "Where is the job? A city, or \"Remote\".";
  if (!form.contractType) errors.contractType = "Choose a contract type.";
  const today = localDate(new Date());
  if (!form.deadline) errors.deadline = "Choose an application deadline.";
  else if (form.deadline <= today) errors.deadline = "The deadline must be after today.";
  return errors;
}

/** The API answers invalid fields with {field: message}; anything else is a general error. */
export function serverFieldErrors(data) {
  if (!data || typeof data !== "object" || data.message) return {};
  return Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v === "string"));
}

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDate(d);
};

export default function OfferForm({ form, setForm, errors, submitting, submitLabel, submittingLabel, onSubmit, onCancel }) {
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const show = (field) => (submitted || touched[field]) && errors[field];

  const bind = (field) => ({
    value: form[field],
    onChange: (e) => setForm({ ...form, [field]: e.target.value }),
    onBlur: () => setTouched((t) => ({ ...t, [field]: true })),
    "aria-invalid": show(field) ? true : undefined,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid" noValidate>
      <div className="form-group form-full-width">
        <label>Job title *</label>
        <input type="text" placeholder="e.g. Senior Fullstack Developer" {...bind("title")} />
        {show("title") && <span className="field-error">{errors.title}</span>}
      </div>

      <div className="form-group form-full-width">
        <label>Job description *</label>
        <textarea placeholder="The role, the tasks, the skills you're looking for..." {...bind("description")} />
        {show("description") && <span className="field-error">{errors.description}</span>}
      </div>

      <div className="form-group">
        <label>Location *</label>
        <input type="text" placeholder="e.g. Tunis, Tunisia (or Remote)" {...bind("location")} />
        {show("location") && <span className="field-error">{errors.location}</span>}
      </div>

      <div className="form-group">
        <label>Contract type *</label>
        <select {...bind("contractType")}>
          <option value="CDI">CDI</option>
          <option value="CDD">CDD</option>
          <option value="STAGE">Stage (Internship)</option>
          <option value="FREELANCE">Freelance</option>
        </select>
        {show("contractType") && <span className="field-error">{errors.contractType}</span>}
      </div>

      <div className="form-group">
        <label>Application deadline *</label>
        <input type="date" min={tomorrow()} {...bind("deadline")} />
        {show("deadline") && <span className="field-error">{errors.deadline}</span>}
      </div>

      <div className="form-actions form-full-width">
        <button type="button" className="secondary-btn" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
