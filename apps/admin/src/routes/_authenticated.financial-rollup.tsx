import { createFileRoute } from "@tanstack/react-router";

import { FinancialRollupPage } from "@/features/financial-rollup/FinancialRollupPage";

export const Route = createFileRoute("/_authenticated/financial-rollup")({
  component: FinancialRollupPage,
});
