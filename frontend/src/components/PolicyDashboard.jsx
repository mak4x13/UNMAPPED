import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import SectionDivider from "./SectionDivider";
import { getCopy } from "../config/locales";
import { API_BASE_URL, useProfile } from "../hooks/useProfile";


function CustomScatterTooltip({ active, payload, copy }) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{point.name}</strong>
      <p>
        {copy.tooltipYouthUnemployment}: {point.youthUnemploymentDisplay}
      </p>
      <p>
        {copy.tooltipIllustrativeRisk}: {point.calibratedRisk.toFixed(2)}
      </p>
      <p>
        {copy.tooltipOccupationAnchor}: {point.anchorOccupationLabel}
      </p>
    </div>
  );
}


export default function PolicyDashboard() {
  const { draft } = useProfile();
  const copy = getCopy(draft.ui_locale);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadPolicyData() {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/policy-dashboard`);
        if (active) {
          setDashboard(response.data);
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.detail || "Unable to load policy dashboard.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPolicyData();
    return () => {
      active = false;
    };
  }, []);

  const rows = dashboard?.countries || [];
  const tableRows = dashboard?.top_risk_rows || [];
  const summary = useMemo(() => {
    const liveCount = rows.filter((row) => row.data_freshness === "live").length;
    const cachedCount = rows.length - liveCount;
    const highestRisk = [...rows].sort((a, b) => b.calibrated_risk - a.calibrated_risk)[0];
    return {
      liveCount,
      cachedCount,
      highestRisk,
    };
  }, [rows]);

  if (loading) {
    return (
      <section className="page-stack">
        <div className="section-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">{copy.policyEyebrow}</p>
              <h2>{copy.policyTitle}</h2>
            </div>
            <p className="section-copy">{copy.policyCopy}</p>
          </div>
          <div className="loading-grid">
            <div className="skeleton-card tall" />
            <div className="skeleton-card tall" />
            <div className="skeleton-card tall" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      {error ? <div className="alert-banner">{error}</div> : null}

      <div className="section-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">{copy.policyEyebrow}</p>
            <h2>{copy.policyTitle}</h2>
          </div>
          <p className="section-copy">{dashboard?.note || copy.policyCopy}</p>
        </div>

        <div className="policy-summary-grid">
          <article className="sub-card">
            <p className="eyebrow">Coverage</p>
            <div className="key-stat">
              <span className="stat-label">Configured countries</span>
              <strong className="stat-number">{rows.length}</strong>
            </div>
            <p className="section-copy">The dashboard compares the four configured LMIC contexts side by side.</p>
          </article>

          <article className="sub-card">
            <p className="eyebrow">Freshness</p>
            <div className="key-stat">
              <span className="stat-label">Live macro rows</span>
              <strong className="stat-number">{summary.liveCount}</strong>
            </div>
            <p className="section-copy">
              {summary.cachedCount} country rows are currently using cached fallback values for at least one signal.
            </p>
          </article>

          <article className="sub-card">
            <p className="eyebrow">Illustrative anchor</p>
            <div className="key-stat">
              <span className="stat-label">Highest benchmark risk</span>
              <strong className="stat-number">
                {summary.highestRisk ? summary.highestRisk.calibrated_risk.toFixed(2) : "0.00"}
              </strong>
            </div>
            <p className="section-copy">
              {summary.highestRisk
                ? `${summary.highestRisk.name}: ${summary.highestRisk.anchorOccupationLabel}`
                : "No benchmark available."}
            </p>
          </article>
        </div>

        <SectionDivider label="CROSS-COUNTRY SIGNALS" />

        <div className="policy-grid">
          <article className="sub-card">
            <div className="sub-card-header">
              <h3>{copy.neetComparisonTitle}</h3>
              <span className="note-chip">{copy.liveWhereAvailable}</span>
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="#8FA89E" />
                  <YAxis stroke="#8FA89E" />
                  <Tooltip />
                  <Bar dataKey="neetRate" radius={[6, 6, 0, 0]}>
                    {rows.map((entry) => (
                      <Cell key={entry.code} fill={entry.data_freshness === "live" ? "#00C896" : "#F5A623"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="section-copy">Bars show NEET rate by country. Color reflects live vs cached macro data.</p>
          </article>

          <article className="sub-card">
            <div className="sub-card-header">
              <h3>{copy.riskVsYouthTitle}</h3>
              <span className="note-chip">{copy.occupationRiskIllustrative}</span>
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="youthUnemployment" name={copy.tooltipYouthUnemployment} unit="%" stroke="#8FA89E" />
                  <YAxis dataKey="calibratedRisk" name={copy.calibratedRisk} stroke="#8FA89E" />
                  <Tooltip content={<CustomScatterTooltip copy={copy} />} />
                  <Scatter data={rows} fill="#00C896" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="section-copy">
              Each point uses one illustrative occupation anchor per country and compares its calibrated automation risk
              against current youth unemployment.
            </p>
          </article>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Country context</p>
            <h3>Configured labor-market contexts</h3>
          </div>
          <p className="section-copy">
            These cards show why calibration shifts by country even before looking at any individual profile.
          </p>
        </div>

        <div className="policy-context-grid">
          {rows.map((row) => (
            <article className="sub-card" key={row.code}>
              <div className="sub-card-header">
                <div>
                  <h3>
                    {row.code} {row.name}
                  </h3>
                  <p className="section-copy">
                    {row.region} | {row.economy_type}
                  </p>
                </div>
                <span className={row.data_freshness === "live" ? "risk-pill is-low" : "risk-pill is-moderate"}>
                  {row.data_freshness === "live" ? "Live" : copy.cachedData}
                </span>
              </div>

              <div className="badge-list">
                {row.opportunity_types.map((item) => (
                  <span className="tag-pill static" key={`${row.code}-${item}`}>
                    {item}
                  </span>
                ))}
              </div>

              <div className="policy-metric-grid">
                <div className="key-stat">
                  <span className="stat-label">Calibration factor</span>
                  <strong className="stat-number">{row.calibration_factor.toFixed(2)}</strong>
                </div>
                <div className="key-stat">
                  <span className="stat-label">Anchor benchmark</span>
                  <strong className="stat-number">{row.calibrated_risk.toFixed(2)}</strong>
                </div>
              </div>

              <p className="section-copy">{row.context_note}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">{copy.illustrativeOccupationEyebrow}</p>
            <h3>{copy.topAtRiskTitle}</h3>
          </div>
          <p className="section-copy">{copy.occupationTableCopy}</p>
        </div>

        <div className="table-wrap">
          <table className="data-table policy-table">
            <thead>
              <tr>
                <th>{copy.countryColumn}</th>
                <th>{copy.occupationColumn}</th>
                <th>ISCO</th>
                <th>{copy.illustrativeRiskColumn}</th>
                <th>{copy.labelColumn}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={`${row.country_code}-${row.occupation_code}`}>
                  <td>{row.country}</td>
                  <td>{row.occupation}</td>
                  <td>{row.occupation_code}</td>
                  <td>{row.calibrated_risk.toFixed(2)}</td>
                  <td>
                    <span className="note-chip">{copy.illustrativeLabel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
