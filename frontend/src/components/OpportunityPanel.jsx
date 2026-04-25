import EconSignalBadge from "./EconSignalBadge";
import { getCopy } from "../config/locales";
import { useProfile } from "../hooks/useProfile";


function resourceHref(label) {
  const links = {
    "Google Digital Garage": "https://learndigital.withgoogle.com/digitalgarage",
    "GOGLA training modules": "https://www.gogla.org/",
    "Safaricom business resources": "https://www.safaricom.co.ke/business/",
    "Ajira Digital resources": "https://ajiradigital.go.ke/",
    "Cisco Networking Academy - IT Essentials": "https://www.netacad.com/courses/os-it/it-essentials",
    "Alison technical courses": "https://alison.com/",
    "CFI financial literacy resources": "https://corporatefinanceinstitute.com/resources/wealth-management/financial-literacy/",
    "Alison - Diploma in Electrical Studies": "https://alison.com/course/diploma-in-electrical-studies",
  };
  return links[label] || `https://www.google.com/search?q=${encodeURIComponent(label)}`;
}


export default function OpportunityPanel({ opportunities, loading }) {
  const { draft } = useProfile();
  const copy = getCopy(draft.ui_locale);

  if (loading || !opportunities) {
    return (
      <section className="section-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">{copy.opportunityModuleTag}</p>
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
          <p className="eyebrow">{copy.opportunityModuleTag}</p>
          <h2>{copy.opportunityTitle}</h2>
        </div>
        <p className="section-copy">{opportunities.note}</p>
      </div>

      <div className="signal-row">
        {opportunities.market_signals.slice(0, 3).map((signal) => (
          <EconSignalBadge
            key={signal.label}
            label={signal.label}
            value={signal.value}
            source={signal.source}
            year={signal.year}
            dataFreshness={opportunities.data_freshness}
          />
        ))}
      </div>

      <div className="opportunity-grid">
        {opportunities.opportunities.map((opportunity) => (
          <article className="opportunity-card" key={opportunity.title}>
            <div className="sub-card-header">
              <h3>{opportunity.title}</h3>
              <span className="stat-chip">{opportunity.type}</span>
            </div>
            <p className="opportunity-copy">{opportunity.fit_summary}</p>
            <p className="section-copy">{opportunity.why_now}</p>
            <div className="opportunity-footer">
              <span className="note-chip">{copy.illustrativeLabel}</span>
              <a className="inline-link" href={resourceHref(opportunity.resource)} rel="noreferrer" target="_blank">
                {opportunity.resource}
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
