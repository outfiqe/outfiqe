import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { PlatformSectionGuard } from "@/components/PlatformSectionGuard";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/_authenticated")({
  pendingComponent: () => null,
  component: () => (
    <ProtectedRoute>
      <AppShell>
        <PlatformSectionGuard>
          <Outlet />
        </PlatformSectionGuard>
      </AppShell>
    </ProtectedRoute>
  ),
});
