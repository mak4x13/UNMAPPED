import { NavLink, Route, Routes, useLocation } from "react-router-dom";

import CountrySelector from "./components/CountrySelector";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { getCopy } from "./config/locales";
import { useProfile } from "./hooks/useProfile";
import { useReadiness } from "./hooks/useReadiness";
import Home from "./pages/Home";
import PolicyPage from "./pages/PolicyPage";
import ProfilePage from "./pages/ProfilePage";
import ReadinessPage from "./pages/ReadinessPage";


function AppHeader() {
  const { pathname } = useLocation();
  const { draft, setCountryCode, resetJourney } = useProfile();
  const { clearReadiness } = useReadiness();
  const copy = getCopy(draft.ui_locale);
  const youthViewActive = pathname !== "/policy";
  const homeView = pathname === "/";

  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark">UN</div>
        <div>
          <p className="eyebrow">{copy.brandEyebrow}</p>
          <h1 className="brand-title">UNMAPPED</h1>
          <p className="brand-note">{copy.brandNote}</p>
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

      <div className="header-actions">
        {youthViewActive && !homeView ? <CountrySelector compact selectedCountry={draft.country_code} onSelect={setCountryCode} /> : null}
        {youthViewActive ? <LanguageSwitcher compact /> : <p className="header-note">{copy.headerNotePolicy}</p>}
        <button
          className="button button-ghost"
          type="button"
          onClick={() => {
            resetJourney();
            clearReadiness();
          }}
        >
          {copy.resetJourney}
        </button>
      </div>
    </header>
  );
}


export default function App() {
  return (
    <div className="app-shell">
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
