import { createFileRoute } from "@tanstack/react-router";

import { SizeOptionsPage } from "@/features/size-options/components/SizeOptionsPage";

export const Route = createFileRoute("/_authenticated/size-options")({
  component: SizeOptionsPage,
});
