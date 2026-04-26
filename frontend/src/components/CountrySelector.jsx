import { COUNTRIES } from "../config/countries";
import { getCopy } from "../config/locales";
import { useProfile } from "../hooks/useProfile";


export default function CountrySelector({
  compact = false,
  selectedCountry,
  onSelect,
  title = "Choose your country context",
  subtitle = "Switching country updates calibration, API payloads, and live labor market signals without code changes.",
  eyebrow = "",
}) {
  const { draft } = useProfile();
  const copy = getCopy(draft.ui_locale);

  if (compact) {
    return (
      <label className="toolbar-field">
        <span>{copy.reviewCountryLabel}</span>
        <select className="input toolbar-input" value={selectedCountry} onChange={(event) => onSelect(event.target.value)}>
          <option value="" disabled>
            {copy.reviewCountryLabel}
          </option>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h3>{title}</h3>
        </div>
        <p className="section-copy">{subtitle}</p>
      </div>
      <div className="country-grid">
        {COUNTRIES.map((country) => (
          <button
            key={country.code}
            className={country.code === selectedCountry ? "country-card is-active" : "country-card"}
            type="button"
            onClick={() => onSelect(country.code)}
          >
            <div className="country-flag" aria-hidden="true">
              {country.flag}
            </div>
            <div>
              <h4>{country.name}</h4>
              <p className="country-meta">{country.region}</p>
              <p className="country-context">{country.context}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
