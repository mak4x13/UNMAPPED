import { Link } from "react-router-dom";

import SkillsProfile from "../components/SkillsProfile";
import { getCopy } from "../config/locales";
import { useProfile } from "../hooks/useProfile";


export default function ProfilePage() {
  const { profile, econData, loadingEcon, error, draft } = useProfile();
  const copy = getCopy(draft.ui_locale);

  if (!profile) {
    return (
      <section className="section-card empty-state">
        <p className="eyebrow">{copy.profileModuleTag}</p>
        <h2>{copy.profileEmptyTitle}</h2>
        <p>{copy.profileEmptyText}</p>
        <Link className="button" to="/">
          {copy.goHome}
        </Link>
      </section>
    );
  }

  return (
    <div className="page-stack">
      {error ? <div className="alert-banner">{error}</div> : null}
      <SkillsProfile profile={profile} econData={econData} loadingEcon={loadingEcon} />
      <section className="section-card section-inline">
        <div>
          <p className="eyebrow">{copy.nextStepEyebrow}</p>
          <h3>{copy.profileNextTitle}</h3>
          <p>{copy.profileNextText}</p>
        </div>
        <Link className="button" to="/readiness">
          {copy.checkReadiness}
        </Link>
      </section>
    </div>
  );
}
