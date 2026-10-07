import { Missing, ProfileCompleteness, SectionCard } from "../../components/ProfileParts";
import { formatMonthYear } from "../../utils/format";
import { levelLabel } from "./model";

/** The profile as recruiters see it, with the completeness checklist. */
export default function ProfileView({ profile, completeness, cvCard }) {
  // The current job first, then the most recent.
  const experiences = [...(profile.experiences || [])].sort((a, b) =>
    (a.endDate ? 1 : 0) - (b.endDate ? 1 : 0) || String(b.startDate).localeCompare(String(a.startDate)));

  return (
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
                    {e.company} · {formatMonthYear(e.startDate)} – {e.endDate ? formatMonthYear(e.endDate) : "present"}
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
  );
}
