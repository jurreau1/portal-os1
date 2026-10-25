import type { Approval } from "../types";
export function ApprovalCard({
  approval,
  selected,
  onReview,
}: {
  approval: Approval;
  selected: boolean;
  onReview: () => void;
}) {
  return (
    <article className={`approval-card ${selected ? "selected" : ""}`}>
      <div className="approval-symbol" aria-hidden="true">
        ↗
      </div>
      <div className="approval-info">
        <h3>{approval.project}</h3>
        <p>
          {approval.action} request ·{" "}
          <strong>{approval.priority} priority</strong>
        </p>
        <span className={`risk-tag ${approval.risk.toLowerCase()}`}>
          {approval.risk} risk
        </span>
      </div>
      <button
        aria-pressed={selected}
        aria-controls="request-review"
        aria-label={`Review ${approval.project} request ${approval.id}`}
        onClick={onReview}
      >
        {selected ? "Selected" : "Review"}
      </button>
    </article>
  );
}
