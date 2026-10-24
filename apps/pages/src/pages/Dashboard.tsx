import { Link } from "react-router-dom";
import { getDashboard } from "../api/analytics";
import { useApi } from "../hooks/useApi";
import { MetricTile } from "../components/MetricTile";
import { AsyncState } from "../components/AsyncState";
export default function Dashboard() {
  const state = useApi(getDashboard);
  const data = state.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE, AT A GLANCE</div>
          <h1>
            Governor dashboard<span className="title-dot">.</span>
          </h1>
          <p>A clear view of your products, pipeline, and decisions.</p>
        </div>
        <Link className="button primary" to="/portfolio">
          Explore portfolio <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <AsyncState {...state} retry={state.reload} />
      {data && (
        <>
          <div className="metrics">
            <MetricTile
              title="Total projects"
              value={data.projects}
              detail="Across your workspace"
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
              detail="Awaiting their next step"
              icon="↗"
            />
            <MetricTile
              title="Pending approvals"
              value={data.approvals}
              detail="Decisions that need you"
              icon="✓"
            />
            <MetricTile
              title="Process health"
              value={data.health}
              detail={
                data.health === null
                  ? "No process telemetry yet"
                  : "% healthy process states"
              }
              icon="⌁"
            />
          </div>
          <div className="dashboard-grid">
            <section className="panel overview">
              <div className="section-heading">
                <div>
                  <h2>From idea to impact</h2>
                  <p>Your next move starts here.</p>
                </div>
                <span className="small-tag">PORTAL WORKFLOW</span>
              </div>
              <div className="workflow">
                <Link to="/portfolio">
                  <span>01</span>
                  <strong>Discover</strong>
                  <p>Review your portfolio</p>
                  <b>↗</b>
                </Link>
                <Link to="/pipeline">
                  <span>02</span>
                  <strong>Build</strong>
                  <p>Follow the pipeline</p>
                  <b>↗</b>
                </Link>
                <Link to="/approvals">
                  <span>03</span>
                  <strong>Launch</strong>
                  <p>Make the next decision</p>
                  <b>↗</b>
                </Link>
              </div>
              <div className="panel-note">
                <span className="status-dot" /> Product data comes directly from
                your Worker API.
              </div>
            </section>
            <section className="panel decision-panel">
              <div className="eyebrow">GOVERNOR DESK</div>
              <div className="decision-icon">✓</div>
              <h2>
                {data.approvals
                  ? "Your judgment matters."
                  : "You’re all caught up."}
              </h2>
              <p>
                {data.approvals
                  ? `${data.approvals} pending ${data.approvals === 1 ? "decision is" : "decisions are"} waiting for your review.`
                  : "New approval requests will appear in your queue."}
              </p>
              <Link className="button" to="/approvals">
                Open approval queue <span>→</span>
              </Link>
            </section>
          </div>
          <section className="panel system-panel">
            <div>
              <span className="eyebrow">CONNECTED ARCHITECTURE</span>
              <h2>One workspace. A clear boundary.</h2>
              <p>Pages presents your workspace. The Worker serves your data.</p>
            </div>
            <div className="architecture">
              <span>Pages</span>
              <b>→</b>
              <span>Worker API</span>
              <b>→</b>
              <span>D1 + Actors</span>
            </div>
          </section>
        </>
      )}
    </>
  );
}
