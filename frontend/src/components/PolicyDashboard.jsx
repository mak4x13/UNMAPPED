import axios from "axios";
import { useEffect, useState } from "react";
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

import { COUNTRIES, COUNTRY_ISO2 } from "../config/countries";
import { getCopy } from "../config/locales";
import { API_BASE_URL } from "../hooks/useProfile";
import { useProfile } from "../hooks/useProfile";


const illustrativeRisk = {
  GHA: { occupation: "Electronics Mechanics and Servicers", calibratedRisk: 0.38 },
  PAK: { occupation: "Shop Salespersons", calibratedRisk: 0.57 },
  KEN: { occupation: "Field Crop and Vegetable Growers", calibratedRisk: 0.62 },
  BGD: { occupation: "Sewing Machine Operators", calibratedRisk: 0.58 },
};

const topAtRiskOccupations = {
  GHA: [
    ["Shop Salespersons", 0.63],
    ["Stock Clerks", 0.63],
    ["Car, Taxi and Van Drivers", 0.61],
    ["Accounting Clerks", 0.66],
    ["Sewing Machine Operators", 0.67],
  ],
  PAK: [
    ["Shop Salespersons", 0.57],
    ["Sewing Machine Operators", 0.61],
    ["Bookkeeping Clerks", 0.60],
    ["Crop Farm Labourers", 0.55],
    ["Contact Centre Salespersons", 0.61],
  ],
  KEN: [
    ["Field Crop and Vegetable Growers", 0.62],
    ["Shop Salespersons", 0.65],
    ["General Office Clerks", 0.68],
    ["Food Preparation Workers", 0.66],
    ["Car, Taxi and Van Drivers", 0.63],
  ],
  BGD: [
    ["Sewing Machine Operators", 0.58],
    ["Tailors and Dressmakers", 0.50],
    ["Food Machine Operators", 0.48],
    ["Bookkeeping Clerks", 0.57],
    ["Kitchen Helpers", 0.55],
  ],
};

const fallbackNeet = {
  GHA: 28.4,
  PAK: 20.9,
  KEN: 21.3,
  BGD: 27.8,
};

const fallbackYouth = {
  GHA: 12.1,
  PAK: 7.8,
  KEN: 13.7,
  BGD: 10.6,
};


function parsePercent(value) {
  return Number(String(value).replace("%", "").replace("+", "").replace(" YoY", ""));
}


function CustomScatterTooltip({ active, payload, copy }) {
  if (!active || !payload?.length) {
    return null;
  }
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{point.name}</strong>
      <p>{copy.tooltipYouthUnemployment}: {point.youthUnemployment}%</p>
      <p>{copy.tooltipIllustrativeRisk}: {point.calibratedRisk}</p>
      <p>{copy.tooltipOccupationAnchor}: {point.occupation}</p>
    </div>
  );
}


export default function PolicyDashboard() {
  const { draft } = useProfile();
  const copy = getCopy(draft.ui_locale);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPolicyData() {
      setLoading(true);
      const results = await Promise.all(
        COUNTRIES.map(async (country) => {
          let youthUnemployment = 0;
          let neetRate = fallbackNeet[country.code];
          let dataFreshness = "cached";

          try {
            const econResponse = await axios.get(`${API_BASE_URL}/api/econdata/${country.code}`);
            const youthSignal = econResponse.data.signals.find((signal) => signal.label.includes("Youth Unemployment"));
            youthUnemployment = youthSignal ? parsePercent(youthSignal.value) : fallbackYouth[country.code];
            dataFreshness = econResponse.data.data_freshness;
          } catch {
            youthUnemployment = fallbackYouth[country.code];
          }

          try {
            const neetResponse = await fetch(
              `https://api.worldbank.org/v2/country/${COUNTRY_ISO2[country.code].toLowerCase()}/indicator/SL.UEM.NEET.ZS?format=json&mrv=1`,
            );
            const payload = await neetResponse.json();
            const series = Array.isArray(payload) ? payload[1] : [];
            const latest = Array.isArray(series) ? series.find((entry) => entry.value !== null) : null;
            if (latest?.value != null) {
              neetRate = Number(latest.value);
            }
          } catch {
            neetRate = fallbackNeet[country.code];
          }

          return {
            code: country.code,
            name: country.name,
            neetRate,
            youthUnemployment,
            dataFreshness,
            occupation: illustrativeRisk[country.code].occupation,
            calibratedRisk: illustrativeRisk[country.code].calibratedRisk,
          };
        }),
      );

      if (active) {
        setRows(results);
        setLoading(false);
      }
    }

    loadPolicyData();
    return () => {
      active = false;
    };
  }, []);

  const tableRows = COUNTRIES.flatMap((country) =>
    topAtRiskOccupations[country.code].map(([occupation, risk]) => ({
      country: country.name,
      occupation,
      risk,
    })),
  );

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
                  <XAxis dataKey="name" stroke="#8B90A7" />
                  <YAxis stroke="#8B90A7" />
                  <Tooltip />
                  <Bar dataKey="neetRate" radius={[10, 10, 0, 0]}>
                    {rows.map((entry) => (
                      <Cell key={entry.code} fill={entry.dataFreshness === "live" ? "#4F9CF9" : "#F4A623"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
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
                  <XAxis dataKey="youthUnemployment" name={copy.tooltipYouthUnemployment} unit="%" stroke="#8B90A7" />
                  <YAxis dataKey="calibratedRisk" name={copy.calibratedRisk} stroke="#8B90A7" />
                  <Tooltip content={<CustomScatterTooltip copy={copy} />} />
                  <Scatter data={rows} fill="#56D4B0" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </article>
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

        {loading ? (
          <div className="loading-grid">
            <div className="skeleton-card tall" />
            <div className="skeleton-card tall" />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{copy.countryColumn}</th>
                  <th>{copy.occupationColumn}</th>
                  <th>{copy.illustrativeRiskColumn}</th>
                  <th>{copy.labelColumn}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={`${row.country}-${row.occupation}`}>
                    <td>{row.country}</td>
                    <td>{row.occupation}</td>
                    <td>{row.risk.toFixed(2)}</td>
                    <td>
                      <span className="note-chip">{copy.illustrativeLabel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
