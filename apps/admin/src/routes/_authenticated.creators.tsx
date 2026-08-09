import { createFileRoute } from "@tanstack/react-router";

import { CreatorsPage } from "@/features/creators/CreatorsPage";

export const Route = createFileRoute("/_authenticated/creators")({
  component: CreatorsPage,
});
