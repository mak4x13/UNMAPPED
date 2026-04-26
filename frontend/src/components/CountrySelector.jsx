import { useCountries } from "../config/countries";
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
  const { countries, loadingCountries } = useCountries();
  const copy = getCopy(draft.ui_locale);

  if (compact) {
    return (
      <label className="toolbar-field">
        <span>{copy.reviewCountryLabel}</span>
        <select className="input toolbar-input" value={selectedCountry} onChange={(event) => onSelect(event.target.value)}>
          <option value="" disabled>
            {copy.reviewCountryLabel}
          </option>
          {loadingCountries ? (
            <option value="" disabled>
              Loading countries...
            </option>
          ) : null}
          {countries.map((country) => (
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
        {countries.map((country) => (
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
              <p className="country-context">{country.economy_type}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
