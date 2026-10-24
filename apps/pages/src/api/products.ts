import { api } from "./client";
import type { Product } from "../types";
export const getProducts = (signal?: AbortSignal) =>
  api<Product[]>("/api/products", { signal });
export const getProduct = (id: string, signal?: AbortSignal) =>
  api<Product>(`/api/products/${encodeURIComponent(id)}`, { signal });
export const getPortfolio = (signal?: AbortSignal) =>
  api<Product[]>("/api/portfolio", { signal });
