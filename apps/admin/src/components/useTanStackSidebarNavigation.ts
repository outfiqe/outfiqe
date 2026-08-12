import { useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import type { SidebarNavigationAdapter } from "@outfiqe/components";

export const useTanStackSidebarNavigation = (): SidebarNavigationAdapter => {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();

  return useMemo(
    () => ({
      pathname,
      navigate: (href: string) => navigate({ href }),
    }),
    [pathname, navigate],
  );
};
