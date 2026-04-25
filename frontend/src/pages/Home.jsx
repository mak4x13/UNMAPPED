import OnboardingFlow from "../components/OnboardingFlow";
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
          <p className="hero-text">{copy.homeText}</p>
          <div className="hero-actions">
            <button className="button" type="button" onClick={scrollToFlow}>
              {copy.homePrimary}
            </button>
            <a className="button button-secondary" href="#why-it-matters">
              {copy.homeSecondary}
            </a>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-kicker">{copy.heroKicker}</div>
          <ul className="hero-list">
            <li>{copy.homeBullet1}</li>
            <li>{copy.homeBullet2}</li>
            <li>{copy.homeBullet3}</li>
          </ul>
        </div>
      </section>

      <section className="info-strip" id="why-it-matters">
        <article className="info-card">
          <p className="eyebrow">{copy.stepPrefix} 1</p>
          <h3>{copy.infoStep1Title}</h3>
          <p>{copy.infoStep1Text}</p>
        </article>
        <article className="info-card">
          <p className="eyebrow">{copy.stepPrefix} 2</p>
          <h3>{copy.infoStep2Title}</h3>
          <p>{copy.infoStep2Text}</p>
        </article>
        <article className="info-card">
          <p className="eyebrow">{copy.stepPrefix} 3</p>
          <h3>{copy.infoStep3Title}</h3>
          <p>{copy.infoStep3Text}</p>
        </article>
      </section>

      <OnboardingFlow />
    </div>
  );
}
