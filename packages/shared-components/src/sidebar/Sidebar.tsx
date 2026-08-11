"use client";

import type { ReactElement } from "react";

import { PanelToggleIcon } from "./PanelToggleIcon";
import { SidebarSection } from "./SidebarSection";
import { cx } from "./cx";
import { railClass, toggleButtonClass } from "./styles";
import type { SidebarNavSection, SidebarNavigationAdapter } from "./types";
import { useExpandedGroups } from "./useExpandedGroups";

export type SidebarProps = {
  readonly sections: readonly SidebarNavSection[];
  readonly navigation: SidebarNavigationAdapter;
  readonly ariaLabel: string;
  readonly className?: string;
  readonly collapsed?: boolean;
  readonly onToggleCollapse?: () => void;
};

export const Sidebar = ({
  sections,
  navigation,
  ariaLabel,
  className,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps): ReactElement => {
  const expandedGroups = useExpandedGroups(sections, navigation.pathname, navigation.isActive);

  return (
    <nav aria-label={ariaLabel} className={cx(railClass, className)}>
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cx(toggleButtonClass, "flex", collapsed ? "mx-auto" : "ml-auto")}
        >
          <PanelToggleIcon collapsed={collapsed} />
          <span className="sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
        </button>
      )}
      {sections.map((section) => (
        <SidebarSection
          key={section.id}
          section={section}
          navigation={navigation}
          expandedGroups={expandedGroups}
          collapsed={collapsed}
        />
      ))}
    </nav>
  );
};
