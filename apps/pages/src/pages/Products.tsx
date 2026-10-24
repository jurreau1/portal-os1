import { getProducts } from "../api/products";
import { ProductCard } from "../components/ProductCard";
import { AsyncState, EmptyState } from "../components/AsyncState";
import { useApi } from "../hooks/useApi";
export default function Products() {
  const state = useApi(getProducts);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PRODUCT DIRECTORY</div>
          <h1>
            Products<span className="title-dot">.</span>
          </h1>
          <p>Every product, with a place to grow.</p>
        </div>
      </div>
      <AsyncState {...state} retry={state.reload} />
      {state.data &&
        (state.data.length ? (
          <div className="product-grid">
            {state.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState>No products yet.</EmptyState>
        ))}
    </>
  );
}
