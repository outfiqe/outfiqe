import { createFileRoute } from "@tanstack/react-router";

import { CheckInPage } from "@/features/logistics/hub-operations/components/CheckInPage";

export const Route = createFileRoute("/_authenticated/logistics/check-in")({
  component: CheckInPage,
});
