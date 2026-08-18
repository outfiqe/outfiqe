import { createFileRoute } from "@tanstack/react-router";

import { TrendingDebugPage } from "@/features/trending/TrendingDebugPage";

export const Route = createFileRoute("/_authenticated/trending")({
  component: TrendingDebugPage,
});
