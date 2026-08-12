import type { ComponentType } from "react";

export type SidebarIcon = ComponentType<{ className?: string }>;

export type SidebarNavItem = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon?: SidebarIcon;
  readonly items?: readonly SidebarNavItem[];
};

export type SidebarNavSection = {
  readonly id: string;
  readonly label?: string;
  readonly items: readonly SidebarNavItem[];
};

export type SidebarNavigationAdapter = {
  readonly pathname: string;
  readonly navigate: (href: string) => void;
  readonly isActive?: (href: string, pathname: string) => boolean;
};
