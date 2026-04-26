export default function SectionDivider({ label }) {
  return (
    <div className="section-divider" aria-hidden="true">
      <span>{label}</span>
    </div>
  );
}
