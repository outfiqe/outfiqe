"use client";

import type { SidebarNavigationAdapter } from "@outfiqe/components";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

const isCrossAppHref = (href: string): boolean =>
  href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/admin");

export const useNextSidebarNavigation = (): SidebarNavigationAdapter => {
  const pathname = usePathname();
  const router = useRouter();

  return useMemo(
    () => ({
      pathname,
      navigate: (href: string) => {
        if (isCrossAppHref(href)) {
          window.location.assign(href);
          return;
        }
        router.push(href);
      },
    }),
    [pathname, router],
  );
};
