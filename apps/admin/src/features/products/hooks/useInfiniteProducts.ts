import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { productsApi } from "../api";
import type { ProductStatusValue } from "../schemas";

export const useInfiniteProducts = (status: ProductStatusValue, isThrift?: boolean) => {
  return useInfiniteCursorPage(["products", status, isThrift], (cursor) =>
    productsApi.list(status, cursor, isThrift),
  );
};
