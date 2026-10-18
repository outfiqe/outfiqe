import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/logistics/")({
  beforeLoad: () => {
    throw redirect({ to: "/logistics/hubs", replace: true });
  },
});
