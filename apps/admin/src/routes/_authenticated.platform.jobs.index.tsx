import { createFileRoute } from "@tanstack/react-router";

import { JobsHealthPage } from "@/features/platform-jobs/components/JobsHealthPage";

export const Route = createFileRoute("/_authenticated/platform/jobs/")({
  component: JobsHealthPage,
});
