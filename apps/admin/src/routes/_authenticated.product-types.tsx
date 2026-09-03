import { createFileRoute } from "@tanstack/react-router";

import { ProductTypesPage } from "@/features/product-types/ProductTypesPage";

export const Route = createFileRoute("/_authenticated/product-types")({
  component: ProductTypesPage,
});
