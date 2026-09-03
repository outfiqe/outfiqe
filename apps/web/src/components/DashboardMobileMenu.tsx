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

const HANDLE_CLOSED_SIZE = { width: 74, height: 34 };
const HANDLE_OPEN_SIZE = { width: 112, height: 54 };
const HALF_CIRCLE_RADIUS = "50% 50% 0 0 / 100% 100% 0 0";

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

            <motion.div
              className="fixed inset-x-0 bottom-0 z-40"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={spring}
              drag={prefersReducedMotion ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={dismissOnSwipeDown}
            >
              <nav
                aria-label="Dashboard menu"
                className="max-h-[68vh] overflow-y-auto rounded-t-[28px] bg-card px-3 pb-[calc(3.5rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-14px_44px_-16px_rgba(0,0,0,0.5)]"
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={open ? "Close dashboard menu" : "Open dashboard menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-0 left-1/2 z-50 flex items-center justify-center bg-primary text-primary-foreground shadow-[0_-6px_22px_-6px_rgba(0,0,0,0.45)]"
        style={{ x: "-50%", borderRadius: HALF_CIRCLE_RADIUS }}
        initial={false}
        animate={open ? HANDLE_OPEN_SIZE : HANDLE_CLOSED_SIZE}
        transition={spring}
        whileTap={prefersReducedMotion ? undefined : { scaleX: 0.94 }}
      >
        <motion.span
          className="flex items-center justify-center pb-1"
          animate={{ rotate: open ? 180 : 0 }}
          transition={spring}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </motion.span>
      </motion.button>
    </div>
  );
};
