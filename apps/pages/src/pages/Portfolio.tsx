import { Link } from "react-router-dom";
import { getPortfolio } from "../api/products";
import { AsyncState, EmptyState } from "../components/AsyncState";
import { useApi } from "../hooks/useApi";
export default function Portfolio() {
  const state = useApi(getPortfolio);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE BIG PICTURE</div>
          <h1>
            Portfolio<span className="title-dot">.</span>
          </h1>
          <p>Track potential across every stage of your portfolio.</p>
        </div>
      </div>
      <AsyncState {...state} retry={state.reload} />
      {state.data &&
        (state.data.length ? (
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stage</th>
                  <th>Score</th>
                  <th>Overview</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link to={`/products/${encodeURIComponent(product.id)}`}>
                        {product.name} ↗
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${product.stage.toLowerCase()}`}>
                        {product.stage}
                      </span>
                    </td>
                    <td>
                      <strong>{product.score}</strong>{" "}
                      <span className="muted">/ 100</span>
                    </td>
                    <td>{product.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>No portfolio products yet.</EmptyState>
        ))}
    </>
  );
}
