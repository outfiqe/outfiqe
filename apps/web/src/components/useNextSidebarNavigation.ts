"use client";

import type { SidebarNavigationAdapter } from "@outfiqe/components";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

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
