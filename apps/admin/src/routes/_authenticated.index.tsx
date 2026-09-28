import { createFileRoute } from "@tanstack/react-router";

import { AdminHomeRedirect } from "@/components/AdminHomeRedirect";

export const Route = createFileRoute("/_authenticated/")({
  component: AdminHomeRedirect,
});
