import { createFileRoute } from "@tanstack/react-router";

import { OutfitSlotTypesPage } from "@/features/outfit-slot-types/OutfitSlotTypesPage";

export const Route = createFileRoute("/_authenticated/outfit-slot-types")({
  component: OutfitSlotTypesPage,
});
