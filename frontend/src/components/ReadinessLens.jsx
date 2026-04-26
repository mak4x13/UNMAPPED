import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getCopy, getRiskLabel } from "../config/locales";
import { useProfile } from "../hooks/useProfile";
import RiskBar from "./RiskBar";
import SectionDivider from "./SectionDivider";


function riskPillClass(level) {
  if (level === "low") {
    return "risk-pill is-low";
  }
  if (level === "high") {
    return "risk-pill is-high";
  }
  return "risk-pill is-moderate";
}


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
    "Cisco Networking Academy - Introduction to IoT": "https://www.netacad.com/courses/iot/introduction-iot",
    "GOGLA training modules": "https://www.gogla.org/",
    "Cisco Networking Academy - IT Essentials": "https://www.netacad.com/courses/os-it/it-essentials",
    "Google Digital Garage": "https://learndigital.withgoogle.com/digitalgarage",
    "Coursera - Digital Skills: User Experience (audit mode)": "https://www.coursera.org/learn/digital-skills-user-experience",
    "Alison - Diploma in Electrical Studies": "https://alison.com/course/diploma-in-electrical-studies",
    "Google Career Certificates - digital support resources": "https://grow.google/certificates/it-support/",
  };
  return {
    label: value,
    href: links[value] || `https://www.google.com/search?q=${encodeURIComponent(value)}`,
  };
}


function dedupeNarrativeText(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  const paragraphs = text
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (paragraphs.length > 1) {
    const deduped = paragraphs.filter((item, index) => index === 0 || item !== paragraphs[index - 1]);
    return deduped.join("\n\n");
  }

  if (text.length % 2 === 0) {
    const midpoint = text.length / 2;
    const firstHalf = text.slice(0, midpoint).trim();
    const secondHalf = text.slice(midpoint).trim();
    if (firstHalf && firstHalf === secondHalf) {
      return firstHalf;
    }
  }

  return text;
}


export default function ReadinessLens({ readiness, loading }) {
  const { draft } = useProfile();
  const copy = getCopy(draft.ui_locale);

  if (loading || !readiness) {
    return (
      <section className="section-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">{copy.readinessModuleTag}</p>
            <h2>{copy.readinessLoadingTitle}</h2>
          </div>
        </div>
        <div className="loading-grid">
          <div className="skeleton-card tall" />
          <div className="skeleton-card tall" />
        </div>
      </section>
    );
  }

  const calibrated = readiness.automation_probability_lmic_calibrated;
  const raw = readiness.automation_probability_raw;
  const chartData = [
    {
      label: "2025",
      completion: Number(String(readiness.wittgenstein_projection.secondary_completion_2025).replace("%", "")),
    },
    {
      label: "2035",
      completion: Number(String(readiness.wittgenstein_projection.secondary_completion_2035_projected).replace("%", "")),
    },
  ];
  const readinessNarrative = dedupeNarrativeText(readiness.narrative);

  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          <p className="eyebrow">{copy.readinessModuleTag}</p>
          <h2>{copy.readinessTitle}</h2>
        </div>
        <p className="section-copy">{copy.readinessExplainer}</p>
      </div>

      <div className="readiness-header">
        <div className="readiness-gauge-card">
          <div className="key-stat">
            <span className="stat-label">{copy.calibratedRisk}</span>
            <strong className="stat-number">{calibrated.toFixed(2)}</strong>
          </div>
          <div className="probability-stack">
            <div className="probability-row">
              <span>{copy.rawAutomationProbability}</span>
              <strong>{raw.toFixed(2)}</strong>
            </div>
            <div className="probability-row">
              <span>{copy.lmicCalibratedProbability}</span>
              <strong>{calibrated.toFixed(2)}</strong>
            </div>
            <RiskBar probability={calibrated} />
            <p className="section-copy">{readiness.calibration_note}</p>
          </div>
        </div>

        <div className="readiness-side">
          <div className="sub-card">
            <div className="sub-card-header">
              <h3>{copy.riskLevelTitle}</h3>
              <span className={riskPillClass(readiness.risk_level)}>{getRiskLabel(readiness.risk_level, draft.ui_locale)}</span>
            </div>
            <p className="metric-copy">{copy.riskHorizonPrefix}: {readiness.risk_horizon_years}</p>
            {readiness.occupation_mapping_note ? <p className="note-chip">{readiness.occupation_mapping_note}</p> : null}
          </div>

          <div className="sub-card">
            <div className="sub-card-header">
              <h3>{copy.econometricContextTitle}</h3>
            </div>
            <div className="mini-signal-list">
              <div className="mini-signal">
                <span>{readiness.econometric_signals.youth_unemployment_rate.value}</span>
                <p>{copy.youthUnemploymentLabel} | {readiness.econometric_signals.youth_unemployment_rate.source}</p>
              </div>
              <div className="mini-signal">
                <span>{readiness.econometric_signals.neet_rate.value}</span>
                <p>{copy.neetRateLabel} | {readiness.econometric_signals.neet_rate.source}</p>
              </div>
              <div className="mini-signal">
                <span>{readiness.econometric_signals.ict_sector_employment_growth.value}</span>
                <p>{copy.ictGrowthLabel} | {readiness.econometric_signals.ict_sector_employment_growth.source}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionDivider label="WHAT MAY CHANGE" />

      <div className="two-column-layout">
        <article className="sub-card">
          <div className="sub-card-header">
            <h3>{copy.skillsAtRiskTitle}</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table skills-risk-table">
              <thead>
                <tr>
                  <th>{copy.skillColumn}</th>
                  <th>{copy.riskColumn}</th>
                  <th>{copy.reasonColumn}</th>
                </tr>
              </thead>
              <tbody>
                {readiness.skills_at_risk.map((entry) => (
                  <tr key={entry.skill}>
                    <td>{entry.skill}</td>
                    <td>
                      <span className={riskPillClass(entry.risk)}>{getRiskLabel(entry.risk, draft.ui_locale)}</span>
                    </td>
                    <td>{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="sub-card durable-card">
          <div className="sub-card-header">
            <h3>{copy.durableSkillsTitle}</h3>
          </div>
          <div className="durable-grid">
            {readiness.durable_skills.map((entry) => (
              <article className="durable-item" key={entry.skill}>
                <h4>{entry.skill}</h4>
                <p>{entry.reason}</p>
              </article>
            ))}
          </div>
        </article>
      </div>

      <SectionDivider label="NEXT MOVES" />

      <div className="two-column-layout">
        <article className="sub-card">
          <div className="sub-card-header">
            <h3>{copy.upskillingPathsTitle}</h3>
          </div>
          <div className="accordion-stack">
            {readiness.adjacent_skills_recommended.map((path) => {
              const resourceLink = resolveResourceLink(path.free_resource);
              return (
                <details className="accordion-card" key={path.skill}>
                  <summary>
                    <div className="accordion-copy">
                      <strong>{path.skill}</strong>
                      <p>{path.effort}</p>
                    </div>
                    <span className="accordion-trigger">
                      <span>See details</span>
                      <span className="accordion-chevron" aria-hidden="true">
                        +
                      </span>
                    </span>
                  </summary>
                  <p>{path.why}</p>
                  <a className="inline-link" href={resourceLink.href} rel="noreferrer" target="_blank">
                    {resourceLink.label}
                  </a>
                </details>
              );
            })}
          </div>
        </article>

        <article className="sub-card">
          <div className="sub-card-header">
            <div>
              <h3>{copy.projectionTitle}</h3>
              <p className="section-copy">{readiness.wittgenstein_projection.region}</p>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" interval={0} stroke="#8B90A7" tickLine={false} type="category" />
                <YAxis stroke="#8B90A7" tickFormatter={(value) => (Number(value) === 0 ? "" : value)} />
                <Tooltip />
                <Bar dataKey="completion" fill="#56D4B0" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="section-copy">{readiness.wittgenstein_projection.implication}</p>
        </article>
      </div>

      {readinessNarrative ? <blockquote className="narrative-block">{readinessNarrative}</blockquote> : null}
    </section>
  );
}
