import type { ComponentType, CSSProperties, ReactNode } from "react";

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

export type SidebarLinkRenderProps = {
  readonly href: string;
  readonly isActive: boolean;
  readonly isAncestorActive: boolean;
  readonly collapsed: boolean;
  readonly baseClassName: string;
  readonly activeClassName: string;
  readonly ancestorClassName: string;
  readonly inactiveClassName: string;
  readonly title?: string;
  readonly style?: CSSProperties;
  readonly children: ReactNode;
};

export type SidebarLinkComponent = ComponentType<SidebarLinkRenderProps>;

export type SidebarNavigationAdapter = {
  readonly pathname: string;
  readonly navigate: (href: string) => void;
  readonly isActive?: (href: string, pathname: string) => boolean;
  readonly LinkComponent?: SidebarLinkComponent;
};
