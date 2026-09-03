"use client";

import type { SidebarLinkRenderProps } from "@outfiqe/components";
import NextLink, { useLinkStatus } from "next/link";

import { cn } from "@/shared/lib/cn";

import { useSidebarPendingNav } from "./SidebarPendingNavContext";

const isCrossAppHref = (href: string): boolean =>
  href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/admin");

const NavPendingDot = () => {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "ml-1 size-1.5 shrink-0 rounded-full bg-current transition-opacity duration-150",
        pending ? "opacity-70 motion-safe:animate-pulse" : "opacity-0",
      )}
    />
  );
};

export const DashboardSidebarLink = ({
  href,
  isActive,
  isAncestorActive,
  collapsed,
  baseClassName,
  activeClassName,
  ancestorClassName,
  inactiveClassName,
  title,
  style,
  children,
}: SidebarLinkRenderProps) => {
  const { pendingHref, markPending } = useSidebarPendingNav();

  const classNameFor = (active: boolean): string =>
    cn(
      baseClassName,
      active ? activeClassName : isAncestorActive ? ancestorClassName : inactiveClassName,
    );

  if (isCrossAppHref(href)) {
    return (
      <a href={href} title={title} style={style} className={classNameFor(isActive)}>
        {children}
      </a>
    );
  }

  const active = pendingHref === null ? isActive : pendingHref === href;

  return (
    <NextLink
      href={href}
      onNavigate={() => markPending(href)}
      aria-current={active ? "page" : undefined}
      title={title}
      style={style}
      className={classNameFor(active)}
    >
      {children}
      {!collapsed && <NavPendingDot />}
    </NextLink>
  );
};
