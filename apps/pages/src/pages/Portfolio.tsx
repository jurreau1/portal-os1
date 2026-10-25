import { useState } from "react";
import { Link } from "react-router-dom";
import { getPortfolio } from "../api/products";
import { AsyncState, EmptyState } from "../components/AsyncState";
import { RefreshControl } from "../components/RefreshControl";
import { ProductCard } from "../components/ProductCard";
import { useApi } from "../hooks/useApi";
export default function Portfolio() {
  const state = useApi(getPortfolio);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [sort, setSort] = useState("score-desc");
  const [view, setView] = useState<"table" | "cards">("table");
  const products = (state.data ?? [])
    .filter(
      (product) =>
        (stage === "all" || product.stage === stage) &&
        `${product.name} ${product.description}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "score-asc"
          ? a.score - b.score || a.name.localeCompare(b.name)
          : b.score - a.score || a.name.localeCompare(b.name),
    );
  const clear = () => {
    setQuery("");
    setStage("all");
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ICVS PORTFOLIO</div>
          <h1>
            Portfolio<span className="title-dot">.</span>
          </h1>
          <p>
            Compare opportunities, track progress, and find your next priority.
          </p>
        </div>
        <RefreshControl {...state} />
      </div>
      <AsyncState {...state} retry={state.reload} />
      {state.data && (
        <>
          <div className="portfolio-summary">
            <div>
              <strong>{state.data.length}</strong>
              <span>Total products</span>
            </div>
            <div>
              <strong>
                {
                  state.data.filter((product) => product.stage === "Live")
                    .length
                }
              </strong>
              <span>Live products</span>
            </div>
            <div>
              <strong>
                {state.data.length
                  ? Math.round(
                      state.data.reduce(
                        (sum, product) => sum + product.score,
                        0,
                      ) / state.data.length,
                    )
                  : "—"}
              </strong>
              <span>Average portfolio score</span>
            </div>
          </div>
          <div className="filter-toolbar">
            <label>
              Search portfolio
              <input
                type="search"
                placeholder="Product name or description"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              Stage
              <select
                value={stage}
                onChange={(event) => setStage(event.target.value)}
              >
                <option value="all">All stages</option>
                {[
                  "Idea",
                  "Validation",
                  "Build",
                  "Ready",
                  "Live",
                  "Archived",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Sort by
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="score-desc">Highest score</option>
                <option value="score-asc">Lowest score</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>
            <div
              className="view-toggle"
              role="group"
              aria-label="Portfolio view"
            >
              <button
                aria-pressed={view === "table"}
                onClick={() => setView("table")}
              >
                Table
              </button>
              <button
                aria-pressed={view === "cards"}
                onClick={() => setView("cards")}
              >
                Cards
              </button>
            </div>
          </div>
          <div className="results-line">
            <span role="status">
              {products.length} of {state.data.length} products
            </span>
            {(query || stage !== "all") && (
              <button className="text-button" onClick={clear}>
                Clear filters
              </button>
            )}
          </div>
          {!state.data.length ? (
            <EmptyState>No portfolio products yet.</EmptyState>
          ) : !products.length ? (
            <EmptyState>
              No products match your filters.{" "}
              <button onClick={clear}>Clear filters</button>
            </EmptyState>
          ) : view === "cards" ? (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="panel table-wrap">
              <table>
                <caption className="sr-only">
                  Portfolio products sorted by{" "}
                  {sort === "name"
                    ? "name"
                    : sort === "score-asc"
                      ? "lowest score"
                      : "highest score"}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Stage</th>
                    <th scope="col">Score</th>
                    <th scope="col">Overview</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <Link
                          to={`/products/${encodeURIComponent(product.id)}`}
                        >
                          {product.name} ↗
                        </Link>
                      </td>
                      <td>
                        <span
                          className={`badge ${product.stage.toLowerCase()}`}
                        >
                          {product.stage}
                        </span>
                      </td>
                      <td>
                        <strong>{product.score}</strong>
                        <span className="muted"> / 100</span>
                      </td>
                      <td>{product.description || "No description yet."}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
