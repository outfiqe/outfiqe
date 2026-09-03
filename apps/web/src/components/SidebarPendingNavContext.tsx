"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SidebarPendingNav = {
  readonly pendingHref: string | null;
  readonly markPending: (href: string) => void;
};

type PendingNavigation = {
  readonly href: string;
  readonly fromPathname: string;
};

const STUCK_PENDING_TIMEOUT_MS = 3000;

const SidebarPendingNavContext = createContext<SidebarPendingNav>({
  pendingHref: null,
  markPending: () => {},
});

export const SidebarPendingNavProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const [pending, setPending] = useState<PendingNavigation | null>(null);
  const stuckTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const markPending = useCallback(
    (href: string) => {
      clearTimeout(stuckTimeoutRef.current);
      setPending({ href, fromPathname: pathname });
      stuckTimeoutRef.current = setTimeout(() => setPending(null), STUCK_PENDING_TIMEOUT_MS);
    },
    [pathname],
  );

  useEffect(() => () => clearTimeout(stuckTimeoutRef.current), []);

  const value = useMemo<SidebarPendingNav>(() => {
    const isStillPending = pending !== null && pending.fromPathname === pathname;
    return { pendingHref: isStillPending ? pending.href : null, markPending };
  }, [pending, pathname, markPending]);

  return (
    <SidebarPendingNavContext.Provider value={value}>{children}</SidebarPendingNavContext.Provider>
  );
};

export const useSidebarPendingNav = (): SidebarPendingNav => useContext(SidebarPendingNavContext);
