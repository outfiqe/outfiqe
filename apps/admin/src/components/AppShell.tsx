import { HeaderBar } from "@outfiqe/components";
import { ThemeToggle } from "@outfiqe/design-system";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { CrmSearchBox } from "@/features/crm/CrmSearchBox";
import { ImpersonationActivityBanner } from "@/features/crm/ImpersonationActivityBanner";
import { AdminNotificationBell } from "@/features/notifications";

import { AccountMenu } from "./AccountMenu";
import { AdminSidebar } from "./AdminSidebar";
import { Logo } from "./Logo";

const isCrmAreaPath = (pathname: string) =>
  pathname.startsWith("/crm") && !pathname.startsWith("/crm/invites/accept");

export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = useRouterState({ select: (routerState) => routerState.location.pathname });
  const inCrmArea = isCrmAreaPath(pathname);

  return (
    <div className="min-h-dvh">
      <HeaderBar>
        <Logo className="shrink-0" />
        <span className="hidden self-center text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:inline">
          Admin
        </span>

        {inCrmArea && (
          <div className="ml-auto flex items-center gap-3 sm:ml-0 sm:flex-1 sm:justify-center">
            <span className="hidden font-display text-lg font-bold tracking-tight sm:inline">
              <span className="text-primary">C</span>
              <span className="text-secondary">RM</span>
            </span>
            <CrmSearchBox />
          </div>
        )}

        <div className={`flex items-center gap-3 ${inCrmArea ? "sm:ml-0" : "ml-auto"}`}>
          <AdminNotificationBell />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </HeaderBar>

      <div className="mx-auto flex max-w-6xl gap-4 px-4 py-6 sm:gap-6 sm:py-8 lg:gap-8">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          {inCrmArea && <ImpersonationActivityBanner />}
          {children}
        </main>
      </div>
    </div>
  );
};
