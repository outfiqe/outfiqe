import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/_authenticated")({
  pendingComponent: () => null,
  component: () => (
    <ProtectedRoute>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  ),
});
