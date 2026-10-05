import { Missing, ProfileCompleteness, SectionCard } from "../../components/ProfileParts";
import { SOCIALS, splitList } from "./model";

/** The company profile as candidates see it, with the completeness checklist. */
export default function ProfileView({ profile: p, completeness }) {
  const facts = [
    ["Industry", p.industry], ["Company type", p.companyType], ["Founded", p.foundedYear],
    ["Size", p.companySize], ["Headquarters", p.headquarters], ["Other offices", p.offices],
  ].filter(([, v]) => v);
  const technologies = splitList(p.technologies);

  return (
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
          {technologies.length === 0 ? <Missing>No technologies listed yet.</Missing> : (
            <ul className="tag-list">
              {technologies.map((t) => <li key={t} className="tag">{t}</li>)}
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
  );
}
