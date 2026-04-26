import { useEffect, useRef, useState } from "react";


const IMPACT_STATS = [
  {
    value: 600,
    suffix: "M+",
    label: "Young people with unmapped skills globally (ILO)",
    source: "ILO reference",
  },
  {
    value: 70,
    suffix: "%",
    label: "Of Pakistan's workforce is in the informal sector",
    source: "Country estimate",
  },
  {
    value: 0,
    suffix: "",
    label: "Formal records exist for most of them",
    source: "Platform framing",
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
      {IMPACT_STATS.map((stat) => (
        <ImpactStat key={stat.label} stat={stat} active={active} />
      ))}
    </section>
  );
}
