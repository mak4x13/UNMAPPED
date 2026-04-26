import { useEffect } from "react";
import { Link } from "react-router-dom";

import ProfileExportCard from "../components/ProfileExportCard";
import SectionDivider from "../components/SectionDivider";
import SkillsProfile from "../components/SkillsProfile";
import { getCopy } from "../config/locales";
import { useProfile } from "../hooks/useProfile";


export default function ProfilePage() {
  const { profile, econData, loadingEcon, error, draft, generateProfile, loadingProfile } = useProfile();
  const copy = getCopy(draft.ui_locale);

  useEffect(() => {
    if (!profile || loadingProfile) {
      return;
    }
    if (profile.ui_locale !== draft.ui_locale) {
      generateProfile({ ui_locale: draft.ui_locale });
    }
  }, [draft.ui_locale, loadingProfile, profile?.isco_unit_code]);

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
      <ProfileExportCard profile={profile} countryCode={draft.country_code} />
      <SectionDivider label="NEXT STEP" />
      <section className="section-card profile-next-card">
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
