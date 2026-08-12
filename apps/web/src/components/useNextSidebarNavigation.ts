"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

import type { SidebarNavigationAdapter } from "@outfiqe/components";

export const useNextSidebarNavigation = (): SidebarNavigationAdapter => {
  const pathname = usePathname();
  const router = useRouter();

  return useMemo(
    () => ({
      pathname,
      navigate: (href: string) => router.push(href),
    }),
    [pathname, router],
  );
};
