import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { AdminSidebar } from "./AdminSidebar";
import { Button } from "./Button";

export function AppShell({ children }: { children: ReactNode }) {
  const { state, logout } = useAuth();
  const user = state.status === "signed-in" ? state.user : null;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6">
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            outfiqe<span className="text-primary">.</span>
            <span className="ml-1 hidden align-middle text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:inline">
              Admin
            </span>
          </span>

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
            )}
            <Button variant="outline" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-4 px-4 py-6 sm:gap-6 sm:py-8 lg:gap-8">
        <AdminSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
