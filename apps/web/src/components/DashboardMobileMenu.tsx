"use client";

import { isNavItemActive } from "@outfiqe/components";
import type { PanInfo } from "framer-motion";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut, Menu, X } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";
import { cn } from "@/shared/lib/cn";

import { useDashboardNav } from "./useDashboardNav";

const isCrossAppHref = (href: string): boolean =>
  href.startsWith("http") || href.startsWith("/admin");

const rowClass =
  "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-colors";

const HANDLE_CLOSED_SIZE = { width: 30, height: 66 };
const HANDLE_OPEN_SIZE = { width: 40, height: 80 };
const HANDLE_RADIUS = "50% 0 0 50% / 50% 0 0 50%";

const SWIPE_DISMISS_DISTANCE_PX = 96;
const SWIPE_DISMISS_VELOCITY = 600;

export const shouldDismissOnSwipe = (dragOffset: number, dragVelocity: number): boolean =>
  dragOffset > SWIPE_DISMISS_DISTANCE_PX || dragVelocity > SWIPE_DISMISS_VELOCITY;

export const DashboardMobileMenu = () => {
  const { state } = useAuth();
  const logout = useLogout();
  const pathname = usePathname();
  const { navItems, accountLabel } = useDashboardNav();
  const [open, setOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion() === true;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (state.status !== AuthStatus.AUTHENTICATED || !state.user) return null;

  const closeMenu = () => setOpen(false);

  const dismissOnSwipe = (_event: unknown, swipe: PanInfo) => {
    if (shouldDismissOnSwipe(swipe.offset.x, swipe.velocity.x)) closeMenu();
  };

  const spring = prefersReducedMotion
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 420, damping: 36 } as const);

  return (
    <div className="lg:hidden">
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              onClick={closeMenu}
              className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
            />

            <motion.nav
              aria-label="Dashboard menu"
              className="fixed inset-y-0 right-0 z-50 flex w-[min(20rem,86vw)] flex-col rounded-l-[28px] bg-card shadow-[-16px_0_48px_-18px_rgba(0,0,0,0.5)]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={spring}
              drag={prefersReducedMotion ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.6 }}
              onDragEnd={dismissOnSwipe}
            >
              <div className="flex-1 overflow-y-auto px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
                <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {accountLabel}
                </p>
                <div className="flex flex-col gap-0.5">
                  {navItems.map(({ id, href, label, icon: Icon }) => {
                    const active = isNavItemActive(href, pathname);
                    const className = cn(
                      rowClass,
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    );
                    const content = (
                      <>
                        {Icon && <Icon className="size-[18px] shrink-0" />}
                        {label}
                      </>
                    );

                    return isCrossAppHref(href) ? (
                      <a key={id} href={href} className={className}>
                        {content}
                      </a>
                    ) : (
                      <NextLink
                        key={id}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        onClick={closeMenu}
                        className={className}
                      >
                        {content}
                      </NextLink>
                    );
                  })}
                </div>

                <div className="my-1.5 border-t border-border" />

                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  className={cn(
                    rowClass,
                    "text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-60",
                  )}
                >
                  <LogOut className="size-[18px] shrink-0" />
                  {logout.isPending ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={open ? "Close dashboard menu" : "Open dashboard menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="fixed right-0 top-1/2 z-50 flex items-center justify-center bg-primary text-primary-foreground shadow-[-6px_0_22px_-6px_rgba(0,0,0,0.45)]"
        style={{ y: "-50%", borderRadius: HANDLE_RADIUS }}
        initial={false}
        animate={open ? HANDLE_OPEN_SIZE : HANDLE_CLOSED_SIZE}
        transition={spring}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
      >
        <motion.span
          className="flex items-center justify-center"
          animate={{ rotate: open ? 90 : 0 }}
          transition={spring}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </motion.span>
      </motion.button>
    </div>
  );
};
