"use client";

import { Button } from "@/design-system/components/ui/button";
import { useLogout } from "@/features/auth";

export function DashboardLogoutButton() {
  const logout = useLogout();

  return (
    <Button
      variant="outline"
      className="mt-6"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
    >
      {logout.isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
