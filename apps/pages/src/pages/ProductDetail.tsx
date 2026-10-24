import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct } from "../api/products";
import { AsyncState } from "../components/AsyncState";
import { useApi } from "../hooks/useApi";
export default function ProductDetail() {
  const { id = "" } = useParams();
  const load = useCallback(
    (signal: AbortSignal) => getProduct(id, signal),
    [id],
  );
  const state = useApi(load);
  return (
    <>
      <Link className="back-link" to="/products">
        ← All products
      </Link>
      <AsyncState {...state} retry={state.reload} />
      {state.data && (
        <>
          <div className="page-heading">
            <div>
              <div className="eyebrow">PRODUCT OVERVIEW</div>
              <h1>
                {state.data.name}
                <span className="title-dot">.</span>
              </h1>
              <p>{state.data.description || "No description yet."}</p>
            </div>
            <span className={`badge ${state.data.stage.toLowerCase()}`}>
              {state.data.stage}
            </span>
          </div>
          <section className="panel detail-panel">
            <h2>Product details</h2>
            <dl>
              <div>
                <dt>Portfolio score</dt>
                <dd>{state.data.score} / 100</dd>
              </div>
              <div>
                <dt>Stage</dt>
                <dd>{state.data.stage}</dd>
              </div>
              <div>
                <dt>Product ID</dt>
                <dd>{state.data.id}</dd>
              </div>
              <div>
                <dt>Updated (UTC)</dt>
                <dd>{state.data.updatedAt}</dd>
              </div>
            </dl>
            <Link className="button" to="/approvals">
              Review approval queue →
            </Link>
          </section>
        </>
      )}
    </>
  );
}
