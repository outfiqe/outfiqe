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

const DOCK_HEIGHT = "5rem";
const CLOSE_BUTTON_LIFT = "2.6rem";

const NOTCH_MASK = "radial-gradient(2.375rem 2.375rem at 50% 0, transparent 2.25rem, #000 2.3rem)";

const SWIPE_DISMISS_DISTANCE_PX = 96;
const SWIPE_DISMISS_VELOCITY = 600;

export const shouldDismissOnSwipe = (verticalOffset: number, verticalVelocity: number): boolean =>
  verticalOffset > SWIPE_DISMISS_DISTANCE_PX || verticalVelocity > SWIPE_DISMISS_VELOCITY;

export const DashboardMobileMenu = () => {
  const { state } = useAuth();
  const logout = useLogout();
  const pathname = usePathname();
  const { navItems } = useDashboardNav();
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

  const dismissOnSwipeDown = (_event: unknown, swipe: PanInfo) => {
    if (shouldDismissOnSwipe(swipe.offset.y, swipe.velocity.y)) closeMenu();
  };

  const sheetTransition = prefersReducedMotion
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 400, damping: 40 } as const);

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
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
            />

            <motion.div
              className="fixed inset-x-0 bottom-0 z-50"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={sheetTransition}
              drag={prefersReducedMotion ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={dismissOnSwipeDown}
            >
              <nav
                aria-label="Dashboard menu"
                className="max-h-[62vh] overflow-y-auto rounded-t-[28px] bg-card px-3 pb-3 pt-2.5 shadow-[0_-14px_44px_-16px_rgba(0,0,0,0.5)]"
              >
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
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
              </nav>

              <div
                className="border-t border-border bg-muted"
                style={{
                  height: `calc(${DOCK_HEIGHT} + env(safe-area-inset-bottom))`,
                  maskImage: NOTCH_MASK,
                  WebkitMaskImage: NOTCH_MASK,
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                }}
              />

              <button
                type="button"
                aria-label="Close dashboard menu"
                onClick={closeMenu}
                className="absolute left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg"
                style={{
                  bottom: `calc(${DOCK_HEIGHT} + env(safe-area-inset-bottom) - ${CLOSE_BUTTON_LIFT})`,
                }}
              >
                <X className="size-5" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label="Open dashboard menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-1/2 z-30 flex size-14 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg"
        whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
      >
        <Menu className="size-5" />
      </motion.button>
    </div>
  );
};
