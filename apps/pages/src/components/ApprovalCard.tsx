import type { Approval } from "../types";
export function ApprovalCard({
  approval,
  pending,
  disabled,
  decide,
}: {
  approval: Approval;
  pending: boolean;
  disabled: boolean;
  decide: (action: "approve" | "reject") => void;
}) {
  return (
    <article className="approval-card">
      <div className="approval-symbol" aria-hidden="true">
        ↗
      </div>
      <div className="approval-info">
        <h3>{approval.project}</h3>
        <p>
          {approval.action} request <span>·</span>{" "}
          <strong>{approval.priority} priority</strong> <span>·</span>{" "}
          {approval.risk} risk
        </p>
      </div>
      <div className="button-group">
        <button disabled={pending || disabled} onClick={() => decide("reject")}>
          Reject
        </button>
        <button
          className="primary"
          disabled={pending || disabled}
          onClick={() => decide("approve")}
        >
          {pending ? "Saving…" : "Approve"}
        </button>
      </div>
    </article>
  );
}
