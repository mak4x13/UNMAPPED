function barClass(probability) {
  if (probability < 0.35) {
    return "risk-bar-fill is-low";
  }
  if (probability <= 0.65) {
    return "risk-bar-fill is-moderate";
  }
  return "risk-bar-fill is-high";
}


export default function RiskBar({ probability }) {
  const percent = Math.max(0, Math.min(probability * 100, 100));

  return (
    <div className="risk-bar-block">
      <div className="risk-bar-track" aria-hidden="true">
        <div className={barClass(probability)} style={{ width: `${percent}%` }} />
      </div>
      <div className="risk-bar-scale">
        <span>0.0</span>
        <span>0.5</span>
        <span>1.0</span>
      </div>
    </div>
  );
}
