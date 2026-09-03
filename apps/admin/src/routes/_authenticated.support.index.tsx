import { createFileRoute } from "@tanstack/react-router";

import { SupportInboxPage } from "@/features/support";

export const Route = createFileRoute("/_authenticated/support/")({
  component: SupportInboxPage,
});
