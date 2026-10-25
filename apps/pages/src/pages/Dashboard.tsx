import { Link } from "react-router-dom";
import { getDashboard, getTelemetry } from "../api/analytics";
import { getApprovals } from "../api/approvals";
import { getPortfolio } from "../api/products";
import { useApi } from "../hooks/useApi";
import { MetricTile } from "../components/MetricTile";
import { AsyncState, EmptyState } from "../components/AsyncState";
import { ProcessStates } from "../components/ProcessStates";
import { RefreshControl } from "../components/RefreshControl";
export default function Dashboard() {
  const summary = useApi(getDashboard, 15000);
  const approvals = useApi(getApprovals, 15000);
  const portfolio = useApi(getPortfolio, 15000);
  const runtime = useApi(getTelemetry, 15000);
  const data = summary.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ICVS CONTROL ROOM</div>
          <h1>
            ICVS dashboard<span className="title-dot">.</span>
          </h1>
          <p>
            Portfolio performance, decisions, and runtime signals in one place.
          </p>
        </div>
        <RefreshControl
          updatedAt={summary.updatedAt}
          refreshing={
            summary.refreshing ||
            approvals.refreshing ||
            portfolio.refreshing ||
            runtime.refreshing
          }
          reload={() => {
            summary.reload();
            approvals.reload();
            portfolio.reload();
            runtime.reload();
          }}
        />
      </div>
      <AsyncState {...summary} retry={summary.reload} />
      {data && (
        <div className="metrics">
          <MetricTile
            title="Total projects"
            value={data.projects}
            detail="Across the portfolio"
            icon="▦"
          />
          <MetricTile
            title="Active products"
            value={data.activeProducts}
            detail="Currently live"
            icon="◇"
          />
          <MetricTile
            title="Ready to publish"
            value={data.readyToPublish}
            detail="At the Ready stage"
            icon="↗"
          />
          <MetricTile
            title="Pending approvals"
            value={data.approvals}
            detail="Awaiting your decision"
            icon="✓"
          />
          <MetricTile
            title="Process health"
            value={data.health}
            detail={
              data.health === null
                ? "No process telemetry yet"
                : "% in healthy stored states"
            }
            icon="⌁"
          />
        </div>
      )}
      <div className="dashboard-grid operational-dashboard">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Decisions needing attention</h2>
              <p>Requests ordered by priority.</p>
            </div>
            <Link to="/approvals">View all →</Link>
          </div>
          <AsyncState {...approvals} retry={approvals.reload} />
          {approvals.data?.length === 0 && (
            <EmptyState>No pending decisions. Your queue is clear.</EmptyState>
          )}
          {approvals.data?.slice(0, 4).map((approval) => (
            <Link
              className="queue-preview"
              key={approval.id}
              to={`/approvals?product=${encodeURIComponent(approval.productId)}`}
            >
              <span className="queue-icon">↗</span>
              <div>
                <strong>{approval.project}</strong>
                <span>
                  {approval.action} · {approval.risk} risk
                </span>
              </div>
              <span
                className={`priority-tag ${approval.priority.toLowerCase()}`}
              >
                {approval.priority}
              </span>
              <b>→</b>
            </Link>
          ))}
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Runtime overview</h2>
              <p>Refreshes every 15 seconds.</p>
            </div>
            <Link to="/runtime">Monitor →</Link>
          </div>
          <AsyncState {...runtime} retry={runtime.reload} />
          {runtime.data && <ProcessStates rows={runtime.data} />}
        </section>
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Portfolio leaders</h2>
            <p>Your highest scoring products.</p>
          </div>
          <Link to="/portfolio">Explore portfolio →</Link>
        </div>
        <AsyncState {...portfolio} retry={portfolio.reload} />
        {portfolio.data?.length === 0 && (
          <EmptyState>No products in your portfolio yet.</EmptyState>
        )}
        <div className="leader-grid">
          {portfolio.data?.slice(0, 3).map((product, index) => (
            <Link
              className="leader-card"
              key={product.id}
              to={`/products/${encodeURIComponent(product.id)}`}
            >
              <span className="leader-rank">0{index + 1}</span>
              <div>
                <h3>{product.name}</h3>
                <span className={`badge ${product.stage.toLowerCase()}`}>
                  {product.stage}
                </span>
              </div>
              <strong>
                {product.score}
                <small>/100</small>
              </strong>
            </Link>
          ))}
        </div>
      </section>
      <div className="workspace-shortcuts">
        <Link to="/orchestration">
          <strong>Orchestration</strong>
          <span>Review handoffs and the product workflow →</span>
        </Link>
        <Link to="/pipeline">
          <strong>Pipeline</strong>
          <span>Track products through every stage →</span>
        </Link>
      </div>
    </>
  );
}
