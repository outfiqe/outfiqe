import { createFileRoute } from "@tanstack/react-router";

import { FinancialRollupPage } from "@/features/financial-rollup/FinancialRollupPage";

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const Route = createFileRoute("/_authenticated/financial-rollup")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { range?: string; method?: string; payout?: string; from?: string; to?: string } => ({
    range: asString(search.range),
    method: asString(search.method),
    payout: asString(search.payout),
    from: asString(search.from),
    to: asString(search.to),
  }),
  component: FinancialRollupPage,
});
