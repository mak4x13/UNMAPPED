import {
  getCountryLocaleOptions,
  getCountryVoiceOptions,
  getCopy,
} from "../config/locales";
import { useProfile } from "../hooks/useProfile";


export default function LanguageSwitcher({ compact = false }) {
  const { draft, setUiLocale, setVoiceLocale } = useProfile();
  const copy = getCopy(draft.ui_locale);
  const localeOptions = getCountryLocaleOptions(draft.country_code);
  const voiceOptions = getCountryVoiceOptions(draft.country_code);

  return (
    <section className={compact ? "language-switcher language-switcher-compact" : "section-card language-switcher"}>
      {!compact ? (
        <div className="section-header">
          <div>
            <p className="eyebrow">{copy.quickLanguageTitle}</p>
            <h3>{copy.quickLanguageTitle}</h3>
          </div>
          <p className="section-copy">{copy.quickLanguageCopy}</p>
        </div>
      ) : null}

      <div className={compact ? "language-switcher-grid compact" : "language-switcher-grid"}>
        <label className="field">
          <span>{copy.platformLanguage}</span>
          <select className="input" value={draft.ui_locale} onChange={(event) => setUiLocale(event.target.value)}>
            {localeOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{copy.voiceLanguage}</span>
          <select className="input" value={draft.voice_locale} onChange={(event) => setVoiceLocale(event.target.value)}>
            {voiceOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
