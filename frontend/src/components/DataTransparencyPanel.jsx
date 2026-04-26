function findSignal(signals, indicatorId) {
  return signals.find((signal) => signal.indicator_id === indicatorId);
}

function formatStatusRow({ live, primaryLabel, liveText, cachedText, meta }) {
  return {
    icon: live ? "✓" : "⚠",
    primary: live ? `${primaryLabel} — ${liveText}` : `${primaryLabel} — ${cachedText}`,
    meta,
  };
}

export default function DataTransparencyPanel({ readiness, econData, countryName }) {
  const signals = econData?.signals || [];
  const youth = findSignal(signals, "SDG_0851");
  const gdp = findSignal(signals, "NY.GDP.PCAP.CD");
  const fetchedDate = econData?.fetched_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const live = econData?.data_freshness === "live";
  const factor =
    readiness?.automation_probability_raw > 0
      ? (readiness.automation_probability_lmic_calibrated / readiness.automation_probability_raw).toFixed(2)
      : "0.00";

  const sourceRows = [
    formatStatusRow({
      live,
      primaryLabel: "ILO ILOSTAT",
      liveText: `Youth unemployment ${youth?.value || "Unavailable"} — fetched live`,
      cachedText: `Cached data used (API unavailable)`,
      meta: `[${fetchedDate} · SDG_0851]`,
    }),
    formatStatusRow({
      live,
      primaryLabel: "World Bank WDI",
      liveText: `GDP per capita ${gdp?.value || "Unavailable"} — fetched live`,
      cachedText: `Cached data used (API unavailable)`,
      meta: `[${fetchedDate} · NY.GDP.PCAP.CD]`,
    }),
    {
      icon: "✓",
      primary: `Frey-Osborne Dataset — Automation probability ${readiness?.automation_probability_raw?.toFixed(2) || "0.00"} raw`,
      meta: "[static · 2013 Oxford study]",
    },
    {
      icon: "✓",
      primary: `LMIC Calibration — ${factor} factor applied for ${countryName} context`,
      meta: "",
    },
  ];

  return (
    <details className="section-card transparency-panel">
      <summary>
        <span className="eyebrow">LIMITS AND SOURCES</span>
        <h3>Data Sources Used</h3>
      </summary>
      <div className="transparency-list">
        {sourceRows.map((row) => (
          <div className="transparency-row" key={row.primary}>
            <span className="transparency-icon">{row.icon}</span>
            <div>
              <p className="transparency-primary">{row.primary}</p>
              {row.meta ? <p className="transparency-meta">{row.meta}</p> : null}
            </div>
          </div>
        ))}
        {econData?.transparency_note ? <p className="section-copy">{econData.transparency_note}</p> : null}
      </div>
    </details>
  );
}
