import { useState } from "react";
import { tomorrow } from "../utils/offerValidation";

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
