import type { PipelineColumn } from "../types";
import { ProductCard } from "./ProductCard";
export function PipelineBoard({ columns }: { columns: PipelineColumn[] }) {
  return (
    <div className="pipeline">
      {columns.map((column) => (
        <section className="pipeline-column" key={column.stage}>
          <h3>
            <span className={`stage-dot ${column.stage.toLowerCase()}`} />
            {column.stage}
            <span className="count">{column.products.length}</span>
          </h3>
          {column.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {column.products.length === 0 && (
            <p className="column-empty">No products</p>
          )}
        </section>
      ))}
    </div>
  );
}
