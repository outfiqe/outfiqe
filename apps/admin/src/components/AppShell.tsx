import { HeaderBar } from "@outfiqe/components";
import type { ReactNode } from "react";

import { AccountMenu } from "./AccountMenu";
import { AdminSidebar } from "./AdminSidebar";
import { Logo } from "./Logo";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <HeaderBar>
        <Logo className="shrink-0" />
        <span className="hidden self-center text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:inline">
          Admin
        </span>

        <div className="ml-auto flex items-center gap-3">
          <AccountMenu />
        </div>
      </HeaderBar>

      <div className="mx-auto flex max-w-6xl gap-4 px-4 py-6 sm:gap-6 sm:py-8 lg:gap-8">
        <AdminSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
