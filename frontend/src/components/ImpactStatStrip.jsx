import { useEffect, useRef, useState } from "react";

import { COUNTRIES } from "../config/countries";
import { useProfile } from "../hooks/useProfile";

const INFORMAL_CONTEXT = {
  GHA: 80,
  PAK: 70,
  KEN: 83,
  BGD: 85,
};

const BASE_STATS = [
  {
    value: 600,
    suffix: "M+",
    label: "Young people with unmapped skills globally (ILO)",
    source: "ILO reference",
  },
  {
    value: 0,
    suffix: "",
    label: "Formal records capture most of that work",
    source: "Reality check",
  },
];

function useCountUp(targetValue, active) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    let frameId = 0;
    let start = 0;
    const duration = 1200;

    function tick(timestamp) {
      if (!start) {
        start = timestamp;
      }
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(targetValue * eased));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [active, targetValue]);

  return value;
}

function ImpactStat({ stat, active }) {
  const count = useCountUp(stat.value, active);

  return (
    <article className="impact-card">
      <strong className="impact-value">
        {count}
        {stat.suffix}
      </strong>
      <p className="impact-label">{stat.label}</p>
      <p className="impact-source">{stat.source}</p>
    </article>
  );
}

export default function ImpactStatStrip() {
  const containerRef = useRef(null);
  const [active, setActive] = useState(false);
  const { draft } = useProfile();
  const country = COUNTRIES.find((entry) => entry.code === draft.country_code);
  const contextStat = {
    value: INFORMAL_CONTEXT[draft.country_code] || 70,
    suffix: "%",
    label: country
      ? `Of ${country.name}'s workforce is estimated to work informally`
      : "Of many LMIC workforces, a large share works informally",
    source: "Context estimate",
  };
  const impactStats = [BASE_STATS[0], contextStat, BASE_STATS[1]];

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="impact-strip" ref={containerRef}>
      {impactStats.map((stat) => (
        <ImpactStat key={stat.label} stat={stat} active={active} />
      ))}
    </section>
  );
}
