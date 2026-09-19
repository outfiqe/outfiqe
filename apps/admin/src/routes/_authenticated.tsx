import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoutePendingScreen } from "@/components/RoutePendingScreen";

export const Route = createFileRoute("/_authenticated")({
  pendingComponent: RoutePendingScreen,
  component: () => (
    <ProtectedRoute>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  ),
});
