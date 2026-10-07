import { useState } from "react";
import { Missing, SectionCard } from "../../components/ProfileParts";
import { COMMON_LANGUAGES, EMPTY_EXPERIENCE, EMPTY_LANGUAGE, LANGUAGE_LEVELS } from "./model";

// The three list sections of the profile form. Each one edits its own list in the form state.

export function SkillsEditor({ skills, setForm }) {
  const [input, setInput] = useState("");

  const add = () => {
    const skill = input.trim();
    if (skill && !skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setForm((f) => ({ ...f, skills: [...f.skills, skill] }));
    }
    setInput("");
  };

  return (
    <SectionCard id="edit-skills" title="Skills">
      <div className="tag-input">
        <input id="profile-skill-input" placeholder="Add a skill, then press Enter" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          aria-label="New skill" />
        <button type="button" className="secondary-btn" onClick={add}>Add</button>
      </div>
      {skills.length > 0 && (
        <ul className="tag-list">
          {skills.map((s) => (
            <li key={s} className="tag">
              {s}
              <button type="button" className="tag__remove" aria-label={`Remove ${s}`}
                onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }))}>×</button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function ExperienceEditor({ experiences, setForm, showError, errors }) {
  const update = (index, key, value) =>
    setForm((f) => ({ ...f, experiences: f.experiences.map((e, i) => (i === index ? { ...e, [key]: value } : e)) }));

  return (
    <SectionCard id="edit-experience" title="Experience"
      action={
        <button id="profile-add-experience" type="button" className="secondary-btn btn-compact"
          onClick={() => setForm((f) => ({ ...f, experiences: [...f.experiences, { ...EMPTY_EXPERIENCE }] }))}>
          + Add experience
        </button>
      }>
      {experiences.length === 0 ? <Missing>No experience yet.</Missing> : (
        <div className="experience-editor">
          {experiences.map((x, i) => (
            <div key={i}>
              <div className="experience-row">
                <div className="form-group">
                  <label htmlFor={`exp-position-${i}`}>Position *</label>
                  <input id={`exp-position-${i}`} value={x.position} onChange={(e) => update(i, "position", e.target.value)}
                    aria-invalid={!!showError(`experience-${i}`)} />
                </div>
                <div className="form-group">
                  <label htmlFor={`exp-company-${i}`}>Company *</label>
                  <input id={`exp-company-${i}`} value={x.company} onChange={(e) => update(i, "company", e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor={`exp-start-${i}`}>Start *</label>
                  <input id={`exp-start-${i}`} type="date" value={x.startDate} onChange={(e) => update(i, "startDate", e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor={`exp-end-${i}`}>End (empty = current)</label>
                  <input id={`exp-end-${i}`} type="date" value={x.endDate} onChange={(e) => update(i, "endDate", e.target.value)} />
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
  );
}

export function LanguagesEditor({ languages, setForm, showError, errors }) {
  const update = (index, key, value) =>
    setForm((f) => ({ ...f, languages: f.languages.map((x, j) => (j === index ? { ...x, [key]: value } : x)) }));

  return (
    <SectionCard id="edit-languages" title="Languages"
      action={
        <button id="profile-add-language" type="button" className="secondary-btn btn-compact"
          onClick={() => setForm((f) => ({ ...f, languages: [...f.languages, { ...EMPTY_LANGUAGE }] }))}>
          + Add language
        </button>
      }>
      {languages.length === 0 ? <Missing>No languages yet.</Missing> : (
        <div className="experience-editor">
          <datalist id="common-languages">
            {COMMON_LANGUAGES.map((l) => <option key={l} value={l} />)}
          </datalist>
          {languages.map((l, i) => (
            <div key={i}>
              <div className="language-row">
                <div className="form-group">
                  <label htmlFor={`lang-name-${i}`}>Language *</label>
                  <input id={`lang-name-${i}`} list="common-languages" value={l.language}
                    aria-invalid={!!showError(`language-${i}`)}
                    onChange={(e) => update(i, "language", e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor={`lang-level-${i}`}>Level</label>
                  <select id={`lang-level-${i}`} value={l.level} onChange={(e) => update(i, "level", e.target.value)}>
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
  );
}
