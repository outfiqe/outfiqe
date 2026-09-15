import { createFileRoute } from "@tanstack/react-router";

import { ProductsPage } from "@/features/products/ProductsPage";

export const Route = createFileRoute("/_authenticated/products")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: ProductsPage,
});
