import { createFileRoute } from "@tanstack/react-router";

import { SupportInboxPage } from "@/features/support";

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const Route = createFileRoute("/_authenticated/support/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { assignee?: string; status?: string; category?: string } => ({
    assignee: asString(search.assignee),
    status: asString(search.status),
    category: asString(search.category),
  }),
  component: SupportInboxPage,
});
