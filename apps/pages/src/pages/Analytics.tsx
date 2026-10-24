import { getAnalytics, getTelemetry, getGovernance } from "../api/analytics";
import { AsyncState, EmptyState } from "../components/AsyncState";
import { useApi } from "../hooks/useApi";
export default function Analytics() {
  const products = useApi(getAnalytics);
  const telemetry = useApi(getTelemetry);
  const governance = useApi(getGovernance);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SIGNALS THAT MATTER</div>
          <h1>
            Analytics<span className="title-dot">.</span>
          </h1>
          <p>Understand portfolio progress and operational health.</p>
        </div>
      </div>
      <div className="analytics-grid">
        <section className="panel">
          <h2>Products by stage</h2>
          <AsyncState {...products} retry={products.reload} />
          {products.data?.length === 0 && (
            <EmptyState>No product metrics yet.</EmptyState>
          )}
          {products.data?.map((row) => (
            <div className="analytics-row" key={row.stage}>
              <div>
                <strong>{row.stage}</strong>
                <span>
                  {row.count} products · average score {row.averageScore}
                </span>
              </div>
              <div className="progress">
                <span style={{ width: `${row.averageScore}%` }} />
              </div>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Process telemetry</h2>
          <AsyncState {...telemetry} retry={telemetry.reload} />
          {telemetry.data?.length === 0 && (
            <EmptyState>No process telemetry yet.</EmptyState>
          )}
          {telemetry.data?.map((row) => (
            <div className="stat-row" key={row.state}>
              <span>{row.state}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
          <h2 className="subheading">Governance decisions</h2>
          <AsyncState {...governance} retry={governance.reload} />
          {governance.data?.length === 0 && (
            <EmptyState>No approval history yet.</EmptyState>
          )}
          {governance.data?.map((row) => (
            <div className="stat-row" key={row.status}>
              <span>{row.status}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
