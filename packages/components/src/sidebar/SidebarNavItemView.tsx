import type { MouseEvent, ReactElement } from "react";

import { ChevronIcon } from "./ChevronIcon";
import { cx } from "./cx";
import { isNavItemActive } from "./isNavItemActive";
import {
  navLinkActiveClass,
  navLinkBaseClass,
  navLinkCollapsedClass,
  navLinkExpandedClass,
  navLinkInactiveClass,
  toggleButtonClass,
} from "./styles";
import type { SidebarNavigationAdapter, SidebarNavItem } from "./types";
import type { ExpandedGroups } from "./useExpandedGroups";

const isPlainLeftClick = (event: MouseEvent): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export type SidebarNavItemViewProps = {
  readonly item: SidebarNavItem;
  readonly depth: number;
  readonly navigation: SidebarNavigationAdapter;
  readonly expandedGroups: ExpandedGroups;
  readonly collapsed: boolean;
};

export const SidebarNavItemView = ({
  item,
  depth,
  navigation,
  expandedGroups,
  collapsed,
}: SidebarNavItemViewProps): ReactElement => {
  const active = isNavItemActive(item.href, navigation.pathname, navigation.isActive);
  const hasChildren = !collapsed && (item.items?.length ?? 0) > 0;
  const Icon = item.icon;
  const extraIndentRem = depth * 0.875;
  const indent =
    collapsed || extraIndentRem === 0
      ? undefined
      : { paddingLeft: `calc(0.875rem + ${extraIndentRem}rem)` };

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    navigation.navigate(item.href);
  };

  const link = (
    <a
      href={item.href}
      onClick={handleLinkClick}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      style={indent}
      className={cx(
        navLinkBaseClass,
        collapsed ? navLinkCollapsedClass : navLinkExpandedClass,
        active ? navLinkActiveClass : navLinkInactiveClass,
      )}
    >
      {Icon && <Icon className="size-[18px] shrink-0" />}
      <span className={cx("truncate", collapsed && "sr-only")}>{item.label}</span>
    </a>
  );

  if (!hasChildren) {
    return <li>{link}</li>;
  }

  const expanded = expandedGroups.isExpanded(item.id);
  const submenuId = `${item.id}-submenu`;

  return (
    <li>
      <div className="flex items-center gap-1">
        {link}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={submenuId}
          onClick={() => expandedGroups.toggle(item.id)}
          className={toggleButtonClass}
        >
          <ChevronIcon expanded={expanded} />
          <span className="sr-only">
            {expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
          </span>
        </button>
      </div>
      <ul id={submenuId} hidden={!expanded} className="mt-1 space-y-1">
        {item.items?.map((child) => (
          <SidebarNavItemView
            key={child.id}
            item={child}
            depth={depth + 1}
            navigation={navigation}
            expandedGroups={expandedGroups}
            collapsed={collapsed}
          />
        ))}
      </ul>
    </li>
  );
};
