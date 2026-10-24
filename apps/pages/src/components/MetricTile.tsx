export function MetricTile({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: number | null;
  detail: string;
  icon: string;
}) {
  return (
    <article className="metric">
      <div className="metric-top">
        <span>{title}</span>
        <span className="metric-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <strong>{value === null ? "—" : value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}
