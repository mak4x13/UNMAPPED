import { Link } from "react-router-dom";

import SectionDivider from "./SectionDivider";
import { getCopy } from "../config/locales";
import { useProfile } from "../hooks/useProfile";
import EconSignalBadge from "./EconSignalBadge";


function credentialTone(signal) {
  if (signal.toLowerCase().includes("low")) {
    return "signal-pill is-warn";
  }
  if (signal.toLowerCase().includes("high")) {
    return "signal-pill is-good";
  }
  return "signal-pill is-neutral";
}


export default function SkillsProfile({ profile, econData, loadingEcon }) {
  const { draft } = useProfile();
  const copy = getCopy(draft.ui_locale);
  const portability = Number(profile.portability_score || 0);
  const signals = econData?.signals || [];

  return (
    <section className="section-card profile-card">
      <div className="profile-hero">
        <div className="profile-copy">
          <p className="eyebrow">{copy.profileModuleTag}</p>
          <h2>{copy.profileTitle}</h2>
          <p className="profile-role">
            ISCO {profile.isco_unit_code} | {profile.isco_unit_label}
          </p>
          <p className="profile-meta">
            Major group {profile.isco_major_group} | {profile.isco_major_label}
          </p>
          <div className={credentialTone(profile.credential_labor_market_signal)}>
            {profile.credential_labor_market_signal}
          </div>
        </div>

        <div className="gauge-card">
          <div className="key-stat">
            <span className="stat-label">{copy.portabilityLabel}</span>
            <strong className="stat-number">{portability}</strong>
          </div>
          <div className="plain-progress" aria-hidden="true">
            <div className="plain-progress-fill" style={{ width: `${portability}%` }} />
          </div>
          <p className="gauge-note">{profile.portability_note}</p>
        </div>
      </div>

      <SectionDivider label="YOUR SKILLS" />

      <div className="skills-grid">
        <article className="sub-card">
          <div className="sub-card-header">
            <h3>{copy.formalSkillsTitle}</h3>
            <span className="stat-chip">{profile.esco_skills.length} {copy.formalSkillCountSuffix}</span>
          </div>
          <div className="badge-list">
            {profile.esco_skills.map((skill) => (
              <span className="skill-pill" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </article>

        <article className="sub-card">
          <div className="sub-card-header">
            <h3>{copy.informalSkillsTitle}</h3>
            <span className="stat-chip">{profile.informal_skills_extracted.length} {copy.informalSignalsSuffix}</span>
          </div>
          <div className="badge-list">
            {profile.informal_skills_extracted.map((skill) => (
              <span className="skill-pill skill-pill-accent" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </article>
      </div>

      <SectionDivider label="SUMMARY" />

      <div className="summary-block">
        <div className="summary-heading">
          <span className="summary-icon">O</span>
          <h3>{copy.readableSummaryTitle}</h3>
        </div>
        <p>{profile.profile_summary}</p>
        <div className="confidence-row">
          <span>{copy.confidenceScore}</span>
          <strong>{Math.round(profile.confidence * 100)}%</strong>
        </div>
      </div>

      <SectionDivider label="MARKET SIGNALS" />

      <section className="signal-row">
        {signals.map((signal) => (
          <EconSignalBadge
            key={signal.label}
            label={signal.label}
            value={signal.value}
            source={signal.source}
            year={signal.year}
            loading={loadingEcon}
            dataFreshness={econData?.data_freshness}
          />
        ))}
        {!signals.length && loadingEcon ? [0, 1, 2].map((index) => <EconSignalBadge key={index} loading />) : null}
      </section>

      <div className="skills-cta">
        <div>
          <p className="eyebrow">{copy.marketSignalEyebrow}</p>
          <p className="section-copy">{copy.marketSignalText}</p>
        </div>
        <Link className="button button-secondary" to="/readiness">
          {copy.continueReadiness}
        </Link>
      </div>
    </section>
  );
}
