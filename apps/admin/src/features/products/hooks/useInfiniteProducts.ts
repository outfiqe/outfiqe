import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { productsApi } from "../api/productsApi";
import type { ProductStatusValue } from "../api/productsSchemas";

export const useInfiniteProducts = (status: ProductStatusValue, isThrift?: boolean) => {
  return useInfiniteCursorPage(["products", status, isThrift], (cursor) =>
    productsApi.list(status, cursor, isThrift),
  );
};
