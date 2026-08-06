import { useEffect, useState } from "react";
import { fetchProducts, type ProductsResponse } from "../lib/api";

export type ProductsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ProductsResponse };

export function useProducts(): ProductsState {
  const [state, setState] = useState<ProductsState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof Error ? err.message : "Failed to load catalog." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
