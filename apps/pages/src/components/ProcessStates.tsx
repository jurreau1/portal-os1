import type { ProcessMetric } from "../types";
import { EmptyState } from "./AsyncState";
export function ProcessStates({ rows }: { rows: ProcessMetric[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (!total)
    return <EmptyState>No process telemetry is available yet.</EmptyState>;
  return (
    <div className="process-states">
      {rows.map((row) => (
        <div className="process-state" key={row.state}>
          <div>
            <span className={`state-label ${row.state.toLowerCase()}`}>
              {row.state}
            </span>
            <strong>
              {row.count}{" "}
              <small>({Math.round((row.count / total) * 100)}%)</small>
            </strong>
          </div>
          <meter
            min={0}
            max={total}
            value={row.count}
            aria-label={`${row.state} processes`}
          >
            {row.count} of {total}
          </meter>
        </div>
      ))}
    </div>
  );
}
