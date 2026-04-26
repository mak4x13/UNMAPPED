import { getCopy } from "../config/locales";
import { useProfile } from "../hooks/useProfile";


const MARKDOWN_LINK_PATTERN = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/i;
const URL_PATTERN = /^https?:\/\/\S+$/i;


function resolveResourceLink(resource) {
  const value = String(resource || "").trim();
  const markdownMatch = value.match(MARKDOWN_LINK_PATTERN);
  if (markdownMatch) {
    return { label: markdownMatch[1].trim(), href: markdownMatch[2].trim() };
  }
  if (URL_PATTERN.test(value)) {
    return { label: value, href: value };
  }

  const links = {
    "Google Digital Garage": "https://learndigital.withgoogle.com/digitalgarage",
    "GOGLA training modules": "https://www.gogla.org/",
    "Safaricom business resources": "https://www.safaricom.co.ke/business/",
    "Ajira Digital resources": "https://ajiradigital.go.ke/",
    "Cisco Networking Academy - IT Essentials": "https://www.netacad.com/courses/os-it/it-essentials",
    "Alison technical courses": "https://alison.com/",
    "CFI financial literacy resources": "https://corporatefinanceinstitute.com/resources/wealth-management/financial-literacy/",
    "Alison - Diploma in Electrical Studies": "https://alison.com/course/diploma-in-electrical-studies",
    "Coursera - Digital Skills: User Experience (audit mode)": "https://www.coursera.org/learn/digital-skills-user-experience",
    "Google Career Certificates - digital support resources": "https://grow.google/certificates/it-support/",
  };
  return {
    label: value,
    href: links[value] || `https://www.google.com/search?q=${encodeURIComponent(value)}`,
  };
}


export default function OpportunityPanel({ opportunities, loading, profileLabel }) {
  const { draft } = useProfile();
  const copy = getCopy(draft.ui_locale);

  if (loading || !opportunities) {
    return (
      <section className="section-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Adjacent options</p>
            <h2>{copy.opportunityLoadingTitle}</h2>
          </div>
        </div>
        <div className="loading-grid">
          <div className="skeleton-card tall" />
          <div className="skeleton-card tall" />
          <div className="skeleton-card tall" />
        </div>
      </section>
    );
  }

  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          <p className="eyebrow">Adjacent options</p>
          <h2>Possible next paths from your current skills</h2>
        </div>
        <p className="section-copy">
          {opportunities.note || `These are adjacent options based on the skill mix mapped to ${profileLabel}. They are not direct job matches or guaranteed openings.`}
        </p>
      </div>

      {opportunities.matched_profile_family ? (
        <div className="summary-block">
          <div className="summary-heading">
            <span className="summary-icon">I</span>
            <h3>How these were matched</h3>
          </div>
          <p>
            Current profile: <strong>{profileLabel}</strong>
            {opportunities.matched_occupation_label ? ` (${opportunities.matched_occupation_label})` : ""}.
            Adjacent paths are being drawn from the <strong>{opportunities.matched_profile_family}</strong> family.
          </p>
          {opportunities.match_basis ? <p className="section-copy">{opportunities.match_basis}</p> : null}
        </div>
      ) : null}

      <div className="opportunity-grid">
        {opportunities.opportunities.map((opportunity) => {
          const resourceLink = resolveResourceLink(opportunity.resource);
          return (
            <article className="opportunity-card" key={opportunity.title}>
              <div className="sub-card-header">
                <h3>{opportunity.title}</h3>
                <span className="stat-chip">{opportunity.type}</span>
              </div>
              <p className="opportunity-copy">{opportunity.fit_summary}</p>
              <p className="section-copy">{opportunity.why_now}</p>
              <div className="opportunity-footer">
                <span className="note-chip">{copy.illustrativeLabel}</span>
                <a className="inline-link" href={resourceLink.href} rel="noreferrer" target="_blank">
                  {resourceLink.label}
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
