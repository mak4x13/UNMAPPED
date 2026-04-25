import { useEffect } from "react";
import { Link } from "react-router-dom";

import OpportunityPanel from "../components/OpportunityPanel";
import ReadinessLens from "../components/ReadinessLens";
import { getCopy } from "../config/locales";
import { useProfile } from "../hooks/useProfile";
import { useReadiness } from "../hooks/useReadiness";


export default function ReadinessPage() {
  const { profile, draft, opportunities, loadOpportunities, loadingOpportunities } = useProfile();
  const { readiness, loadingReadiness, error, generateReadiness } = useReadiness();
  const copy = getCopy(draft.ui_locale);

  useEffect(() => {
    if (!profile) {
      return;
    }
    if (!readiness || readiness.country_code !== draft.country_code) {
      generateReadiness(draft.country_code);
    }
    loadOpportunities(draft.country_code, profile.isco_unit_code);
  }, [profile, draft.country_code, draft.ui_locale]);

  if (!profile) {
    return (
      <section className="section-card empty-state">
        <p className="eyebrow">{copy.readinessModuleTag}</p>
        <h2>{copy.readinessEmptyTitle}</h2>
        <p>{copy.readinessEmptyText}</p>
        <Link className="button" to="/">
          {copy.startFromHome}
        </Link>
      </section>
    );
  }

  return (
    <div className="page-stack">
      {error ? <div className="alert-banner">{error}</div> : null}
      <ReadinessLens readiness={readiness} loading={loadingReadiness} />
      <OpportunityPanel opportunities={opportunities} loading={loadingOpportunities} />
    </div>
  );
}
