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

const HANDLE_CLOSED_SIZE = { width: 108, height: 58 };
const HANDLE_OPEN_SIZE = { width: 144, height: 80 };
const HANDLE_SHAPE_PATH = "M0,68 C4,40 18,16 50,16 C82,16 96,40 100,68 Z";

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
    if (shouldDismissOnSwipe(swipe.offset.y, swipe.velocity.y)) closeMenu();
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
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
            />

            <motion.nav
              aria-label="Dashboard menu"
              className="fixed inset-x-0 bottom-0 z-40 flex max-h-[68vh] flex-col rounded-t-[28px] bg-card shadow-[0_-16px_48px_-18px_rgba(0,0,0,0.5)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={spring}
              drag={prefersReducedMotion ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={dismissOnSwipe}
            >
              <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border" />
              <div className="flex-1 overflow-y-auto px-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-2">
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
        className="fixed bottom-0 left-1/2 z-50 flex items-end justify-center text-primary-foreground"
        style={{ x: "-50%" }}
        initial={false}
        animate={open ? HANDLE_OPEN_SIZE : HANDLE_CLOSED_SIZE}
        transition={spring}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
      >
        <svg
          className="absolute inset-0 h-full w-full text-primary"
          viewBox="0 0 100 68"
          preserveAspectRatio="none"
          fill="currentColor"
          aria-hidden="true"
          style={{ filter: "drop-shadow(0 -5px 14px rgba(0,0,0,0.35))" }}
        >
          <path d={HANDLE_SHAPE_PATH} />
        </svg>
        <motion.span
          className="relative mb-2.5 flex items-center justify-center"
          animate={{ rotate: open ? 90 : 0 }}
          transition={spring}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </motion.span>
      </motion.button>
    </div>
  );
};
