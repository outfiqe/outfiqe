import { createFileRoute } from "@tanstack/react-router";

import { PipelinePage } from "@/features/crm/PipelinePage";

export const Route = createFileRoute("/_authenticated/crm/pipeline/")({
  component: PipelinePage,
});
