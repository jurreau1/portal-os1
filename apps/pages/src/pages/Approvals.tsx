import { useState } from "react";
import { Link } from "react-router-dom";
import { getApprovals, approve, reject } from "../api/approvals";
import { AsyncState, EmptyState } from "../components/AsyncState";
import { ApprovalCard } from "../components/ApprovalCard";
import { useApi } from "../hooks/useApi";
import { useGovernor } from "../layouts/GovernorLayout";
export default function Approvals() {
  const state = useApi(getApprovals);
  const { token } = useGovernor();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function decide(id: string, action: "approve" | "reject") {
    setPending(id);
    setError("");
    setMessage("");
    try {
      await (action === "approve" ? approve : reject)(id, token);
      setMessage(`Request ${action === "approve" ? "approved" : "rejected"}.`);
      state.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Decision could not be saved",
      );
    } finally {
      setPending(null);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">HUMAN IN THE LOOP</div>
          <h1>
            Approvals<span className="title-dot">.</span>
          </h1>
          <p>Review the action, weigh the risk, and make the call.</p>
        </div>
      </div>
      {!token && (
        <p className="notice">
          Add your governor token in <Link to="/settings">Settings</Link> to
          make decisions.
        </p>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <AsyncState {...state} retry={state.reload} />
      {state.data &&
        (state.data.length ? (
          <div className="approval-list">
            {state.data.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                pending={pending === approval.id}
                disabled={!token || pending !== null}
                decide={(action) => void decide(approval.id, action)}
              />
            ))}
          </div>
        ) : (
          <EmptyState>No pending approvals. You’re all caught up.</EmptyState>
        ))}
    </>
  );
}
