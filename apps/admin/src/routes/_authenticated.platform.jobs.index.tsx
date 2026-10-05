import { createFileRoute } from "@tanstack/react-router";

import { JobsHealthPage } from "@/features/platform-jobs/JobsHealthPage";

export const Route = createFileRoute("/_authenticated/platform/jobs/")({
  component: JobsHealthPage,
});
