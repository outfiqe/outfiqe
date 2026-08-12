import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { productsApi } from "../api";
import type { ProductStatusValue } from "../schemas";

export const useInfiniteProducts = (status: ProductStatusValue) => {
  return useInfiniteCursorPage(["products", status], (cursor) => productsApi.list(status, cursor));
};
