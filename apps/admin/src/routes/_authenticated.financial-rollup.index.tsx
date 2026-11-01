import { createFileRoute } from "@tanstack/react-router";

import { FinancialRollupPage } from "@/features/financial-rollup/components/FinancialRollupPage";

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const Route = createFileRoute("/_authenticated/financial-rollup/")({
  validateSearch: (search: Record<string, unknown>): { range?: string } => ({
    range: asString(search.range),
  }),
  component: FinancialRollupPage,
});
