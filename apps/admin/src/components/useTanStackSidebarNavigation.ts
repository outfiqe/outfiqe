import type { SidebarNavigationAdapter } from "@outfiqe/components";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";

const EXACT_MATCH_HREFS = new Set(["/crm", "/platform"]);

const isHrefActive = (href: string, pathname: string): boolean => {
  if (href === "/" || EXACT_MATCH_HREFS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
};

export const useTanStackSidebarNavigation = (): SidebarNavigationAdapter => {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();

  return useMemo(
    () => ({
      pathname,
      navigate: (href: string) => navigate({ href }),
      isActive: isHrefActive,
    }),
    [pathname, navigate],
  );
};
