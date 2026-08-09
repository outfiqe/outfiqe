import { createFileRoute, redirect } from "@tanstack/react-router";

// Catch-all: any unmatched path bounces back to "/", same as the old
// react-router `<Route path="*" element={<Navigate to="/" replace />} />`.
export const Route = createFileRoute("/$")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
