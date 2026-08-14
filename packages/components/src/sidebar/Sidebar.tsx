"use client";

import type { ReactElement, ReactNode } from "react";

import { cx } from "./cx";
import { PanelToggleIcon } from "./PanelToggleIcon";
import { SidebarSection } from "./SidebarSection";
import { cardClass, footerListClass, railClass, toggleButtonClass } from "./styles";
import type { SidebarNavigationAdapter, SidebarNavSection } from "./types";
import { useExpandedGroups } from "./useExpandedGroups";

export type SidebarProps = {
  readonly sections: readonly SidebarNavSection[];
  readonly navigation: SidebarNavigationAdapter;
  readonly ariaLabel: string;
  readonly className?: string;
  readonly collapsed?: boolean;
  readonly onToggleCollapse?: () => void;
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
};

export const Sidebar = ({
  sections,
  navigation,
  ariaLabel,
  className,
  collapsed = false,
  onToggleCollapse,
  header,
  footer,
}: SidebarProps): ReactElement => {
  const expandedGroups = useExpandedGroups(sections, navigation.pathname, navigation.isActive);
  const hasTopRow = Boolean(header) || Boolean(onToggleCollapse);

  return (
    <nav aria-label={ariaLabel} className={cx(railClass, className)}>
      {hasTopRow && (
        <div
          className={cx(
            cardClass,
            "flex shrink-0 items-center gap-2",
            collapsed ? "flex-col justify-center" : header ? "justify-between" : "justify-end",
          )}
        >
          {header}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cx(toggleButtonClass, "shrink-0")}
            >
              <PanelToggleIcon collapsed={collapsed} />
              <span className="sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
            </button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {sections.map((section) => (
          <SidebarSection
            key={section.id}
            section={section}
            navigation={navigation}
            expandedGroups={expandedGroups}
            collapsed={collapsed}
          />
        ))}
      </div>

      {footer && (
        <div className={cx(footerListClass, "shrink-0", collapsed && "items-center")}>{footer}</div>
      )}
    </nav>
  );
};
