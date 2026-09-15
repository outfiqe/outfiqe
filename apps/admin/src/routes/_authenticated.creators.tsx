import { createFileRoute } from "@tanstack/react-router";

import { CreatorsPage } from "@/features/creators/CreatorsPage";

export const Route = createFileRoute("/_authenticated/creators")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: CreatorsPage,
});
