import { createFileRoute } from "@tanstack/react-router";

import { PickupBoardPage } from "@/features/logistics/pickup-board/components/PickupBoardPage";

export const Route = createFileRoute("/_authenticated/logistics/pickup-board")({
  component: PickupBoardPage,
});
