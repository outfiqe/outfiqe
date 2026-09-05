"use client";

import { isNavItemActive, type SidebarNavItem } from "@outfiqe/components";
import { LogOut, Menu, SlidersHorizontal, X } from "lucide-react";
import NextLink, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Drawer as VaulDrawer } from "vaul";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";
import { useChatPanel } from "@/features/messaging";
import { cn } from "@/shared/lib/cn";

import { isCrossAppNavHref } from "./dashboardMobileNav";
import { DashboardNavCustomizeSheet } from "./DashboardNavCustomizeSheet";
import { useDashboardMobileNav } from "./useDashboardMobileNav";

const HUB_CENTER_BELOW_PANEL_EDGE = "0.75rem";

const BAR_CRADLE_MASK =
  "radial-gradient(2.25rem 2.25rem at 50% 0, transparent 2.15rem, #000 2.2rem)";

const PANEL_CRADLE_MASK = `radial-gradient(2.25rem 2.25rem at 50% calc(100% + ${HUB_CENTER_BELOW_PANEL_EDGE}), transparent 2.15rem, #000 2.2rem)`;

const maskStyle = (maskImage: string) => ({
  maskImage,
  WebkitMaskImage: maskImage,
  maskRepeat: "no-repeat" as const,
  WebkitMaskRepeat: "no-repeat" as const,
});

const NavPendingDot = () => {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "absolute right-2 top-1.5 size-1.5 rounded-full bg-current transition-opacity duration-150",
        pending ? "opacity-70 motion-safe:animate-pulse" : "opacity-0",
      )}
    />
  );
};

type NavTargetProps = {
  item: SidebarNavItem;
  active: boolean;
  onNavigate: () => void;
  className: string;
  children: ReactNode;
};

const NavTarget = ({ item, active, onNavigate, className, children }: NavTargetProps) => {
  if (isCrossAppNavHref(item.href)) {
    return (
      <a href={item.href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <NextLink
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={className}
    >
      {children}
      <NavPendingDot />
    </NextLink>
  );
};

const PinnedSlot = ({
  item,
  pathname,
  onNavigate,
}: {
  item: SidebarNavItem;
  pathname: string;
  onNavigate: () => void;
}) => {
  const active = isNavItemActive(item.href, pathname);
  const Icon = item.icon;
  return (
    <NavTarget
      item={item}
      active={active}
      onNavigate={onNavigate}
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1 transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {Icon && <Icon className="size-[18px]" />}
      <span className="text-[10px] font-medium leading-none">{item.label}</span>
    </NavTarget>
  );
};

export const DashboardMobileNavBar = () => {
  const { state } = useAuth();
  const logout = useLogout();
  const pathname = usePathname();
  const { isOpen: isChatPanelOpen } = useChatPanel();
  const { pinnedItems, overflowItems, allItems, savePins, resetPins, accountLabel } =
    useDashboardMobileNav();

  const [open, setOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  if (state.status !== AuthStatus.AUTHENTICATED || !state.user || isChatPanelOpen) return null;

  const openCustomize = () => {
    setOpen(false);
    setCustomizeOpen(true);
  };

  const leftPins = pinnedItems.slice(0, 2);
  const rightPins = pinnedItems.slice(2, 4);
  const pinnedIds = pinnedItems.map((item) => item.id);

  return (
    <div className="lg:hidden">
      <VaulDrawer.Root open={open} onOpenChange={(next) => !next && closeMenu()}>
        <VaulDrawer.Portal>
          <VaulDrawer.Overlay
            data-testid="dashboard-menu-backdrop"
            onClick={closeMenu}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
          />

          <VaulDrawer.Content
            aria-label="Dashboard menu"
            className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[5.5rem] outline-none"
          >
            <VaulDrawer.Title className="sr-only">Dashboard menu</VaulDrawer.Title>
            <VaulDrawer.Description className="sr-only">
              Swipe down, tap outside, or press Escape to close.
            </VaulDrawer.Description>

            <nav aria-label="Dashboard menu" className="relative">
              <div
                aria-hidden
                className="absolute inset-0 rounded-[28px] border border-border bg-card"
                style={{
                  ...maskStyle(PANEL_CRADLE_MASK),
                  filter: "drop-shadow(0 -12px 40px rgba(0,0,0,0.32))",
                }}
              />
              <div className="relative max-h-[62vh] overflow-y-auto p-4 pb-10">
                <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {accountLabel}
                </p>

                {overflowItems.length > 0 && (
                  <ul className="grid grid-cols-2 gap-2">
                    {overflowItems.map((item) => {
                      const active = isNavItemActive(item.href, pathname);
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <NavTarget
                            item={item}
                            active={active}
                            onNavigate={closeMenu}
                            className={cn(
                              "relative flex flex-col items-center gap-1.5 rounded-2xl px-3 py-3.5 text-center text-xs font-medium transition-colors",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground hover:bg-muted/70",
                            )}
                          >
                            {Icon && <Icon className="size-5" />}
                            {item.label}
                          </NavTarget>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={openCustomize}
                  className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <SlidersHorizontal className="size-[18px] shrink-0" />
                  Customize navigation
                </button>

                <div className="my-1.5 border-t border-border" />

                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
                >
                  <LogOut className="size-[18px] shrink-0" />
                  {logout.isPending ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </nav>
          </VaulDrawer.Content>
        </VaulDrawer.Portal>
      </VaulDrawer.Root>

      <div data-testid="dashboard-nav-bar" className="fixed inset-x-3 bottom-3 z-50 h-16">
        <div
          aria-hidden
          className="absolute inset-0 rounded-[28px] border border-border bg-card"
          style={{
            ...maskStyle(BAR_CRADLE_MASK),
            filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.12))",
          }}
        />
        <nav aria-label="Dashboard" className="relative flex h-full items-stretch px-2">
          {leftPins.map((item) => (
            <PinnedSlot key={item.id} item={item} pathname={pathname} onNavigate={closeMenu} />
          ))}
          <span aria-hidden className="w-20 shrink-0" />
          {rightPins.map((item) => (
            <PinnedSlot key={item.id} item={item} pathname={pathname} onNavigate={closeMenu} />
          ))}
        </nav>
      </div>

      <button
        type="button"
        aria-label={open ? "Close dashboard menu" : "Open dashboard menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-[3rem] left-1/2 z-50 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_rgba(0,0,0,0.5)] transition-transform active:scale-95"
        style={{ pointerEvents: "auto" }}
      >
        <span
          className={cn(
            "flex items-center justify-center transition-transform duration-200 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]",
            open && "rotate-90",
          )}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </span>
      </button>

      {customizeOpen && (
        <DashboardNavCustomizeSheet
          allItems={allItems}
          pinnedIds={pinnedIds}
          onSave={(ids) => {
            savePins(ids);
            setCustomizeOpen(false);
          }}
          onReset={() => {
            resetPins();
            setCustomizeOpen(false);
          }}
          onClose={() => setCustomizeOpen(false)}
        />
      )}
    </div>
  );
};
