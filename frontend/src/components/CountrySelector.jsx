import { COUNTRIES } from "../config/countries";


export default function CountrySelector({
  compact = false,
  selectedCountry,
  onSelect,
  title = "Choose your country context",
  subtitle = "Switching country updates calibration, API payloads, and live labor market signals without code changes.",
  eyebrow = "",
}) {
  if (compact) {
    return (
      <div className="compact-country-strip" aria-label="Country selector">
        {COUNTRIES.map((country) => (
          <button
            key={country.code}
            className={country.code === selectedCountry ? "compact-country is-active" : "compact-country"}
            type="button"
            onClick={() => onSelect(country.code)}
          >
            <span>{country.flag}</span>
            <span>{country.name}</span>
          </button>
        ))}
      </div>
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
