import ImpactStatStrip from "../components/ImpactStatStrip";
import OnboardingFlow from "../components/OnboardingFlow";
import SectionDivider from "../components/SectionDivider";
import { getCopy } from "../config/locales";
import { useProfile } from "../hooks/useProfile";


export default function Home() {
  const { draft } = useProfile();
  const copy = getCopy(draft.ui_locale);

  function scrollToFlow() {
    document.getElementById("onboarding-flow")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">{copy.homeEyebrow}</p>
          <h2>{copy.homeTitle}</h2>
          <ImpactStatStrip />
          <p className="hero-text">{copy.homeText}</p>
          <div className="hero-actions">
            <button className="button" type="button" onClick={scrollToFlow}>
              {copy.homePrimary}
            </button>
            <a className="button button-secondary" href="#onboarding-flow">
              {copy.homeSecondary}
            </a>
          </div>
        </div>
      </section>

      <SectionDivider label="START HERE" />

      <OnboardingFlow />
    </div>
  );
}
