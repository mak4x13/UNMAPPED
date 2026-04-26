import { useEffect } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import CountrySelector from "./components/CountrySelector";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { getCopy } from "./config/locales";
import { useProfile } from "./hooks/useProfile";
import { useReadiness } from "./hooks/useReadiness";
import Home from "./pages/Home";
import PolicyPage from "./pages/PolicyPage";
import ProfilePage from "./pages/ProfilePage";
import ReadinessPage from "./pages/ReadinessPage";


function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}


function AppHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { draft, interview, profile, setCountryCode, resetJourney } = useProfile();
  const { clearReadiness } = useReadiness();
  const copy = getCopy(draft.ui_locale);
  const youthViewActive = pathname !== "/policy";
  const showCountryToolbar = youthViewActive && pathname !== "/";
  const showLanguageToolbar = youthViewActive && pathname !== "/";
  const hasJourneyState = Boolean(
    draft.country_code ||
      draft.education_level ||
      draft.informal_description ||
      draft.languages.length ||
      draft.age ||
      draft.years_experience ||
      interview ||
      profile,
  );
  const showHeaderActions = showCountryToolbar || showLanguageToolbar || !youthViewActive || hasJourneyState;

  function handleCountryChange(countryCode) {
    setCountryCode(countryCode);
    clearReadiness();
  }

  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark">UN</div>
        <div>
          <p className="eyebrow">{copy.brandEyebrow}</p>
          <h1 className="brand-title">UNMAPPED</h1>
        </div>
      </div>

      <nav className="nav-tabs" aria-label="Primary">
        <NavLink className={({ isActive }) => (isActive ? "tab-link is-active" : "tab-link")} to="/">
          {copy.youthView}
        </NavLink>
        <NavLink className={({ isActive }) => (isActive ? "tab-link is-active" : "tab-link")} to="/policy">
          {copy.policyView}
        </NavLink>
      </nav>

      {showHeaderActions ? (
        <div className="header-actions">
          {showCountryToolbar ? <CountrySelector compact selectedCountry={draft.country_code} onSelect={handleCountryChange} /> : null}
          {showLanguageToolbar ? <LanguageSwitcher compact /> : null}
          {!youthViewActive ? <p className="header-note">{copy.headerNotePolicy}</p> : null}
          {hasJourneyState ? (
            <button
              className="button button-ghost toolbar-reset"
              type="button"
              onClick={() => {
                resetJourney();
                clearReadiness();
                navigate("/");
              }}
            >
              {copy.resetJourney}
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}


export default function App() {
  return (
    <div className="app-shell">
      <ScrollToTop />
      <AppHeader />
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/readiness" element={<ReadinessPage />} />
          <Route path="/policy" element={<PolicyPage />} />
        </Routes>
      </main>
    </div>
  );
}
