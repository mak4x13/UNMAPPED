import { getCopy } from "../config/locales";
import { useProfile } from "../hooks/useProfile";


export default function EconSignalBadge({ label, value, source, year, loading = false, dataFreshness = "live" }) {
  const { draft } = useProfile();
  const copy = getCopy(draft.ui_locale);

  if (loading) {
    return (
      <div className="econ-badge skeleton-card">
        <div className="skeleton skeleton-value" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
      </div>
    );
  }

  return (
    <div className="econ-badge">
      <div className="econ-badge-header">
        <span className="econ-value">{value}</span>
        {dataFreshness === "cached" ? <span className="cached-chip">{copy.cachedData}</span> : null}
      </div>
      <p className="econ-label">{label}</p>
      <p className="econ-meta">
        {source}
        {year ? ` | ${year}` : ""}
      </p>
    </div>
  );
}
