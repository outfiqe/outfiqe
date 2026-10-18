import { createFileRoute } from "@tanstack/react-router";

import { HandoverPage } from "@/features/logistics/hub-operations/components/HandoverPage";

export const Route = createFileRoute("/_authenticated/logistics/handover")({
  component: HandoverPage,
});
