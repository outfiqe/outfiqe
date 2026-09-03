import type { MouseEvent, ReactElement } from "react";

import { ChevronIcon } from "./ChevronIcon";
import { cx } from "./cx";
import { isNavItemActive } from "./isNavItemActive";
import {
  navLinkActiveClass,
  navLinkAncestorActiveClass,
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

const hasActiveDescendant = (
  navItems: readonly SidebarNavItem[] | undefined,
  pathname: string,
  isActive?: (href: string, pathname: string) => boolean,
): boolean =>
  (navItems ?? []).some(
    (child) =>
      isNavItemActive(child.href, pathname, isActive) ||
      hasActiveDescendant(child.items, pathname, isActive),
  );

export type SidebarNavItemViewProps = {
  readonly item: SidebarNavItem;
  readonly depth: number;
  readonly navigation: SidebarNavigationAdapter;
  readonly expandedGroups: ExpandedGroups;
  readonly collapsed: boolean;
};

export const SidebarNavItemView = ({
  item: { href, items, icon: Icon, label, id },
  depth,
  navigation,
  expandedGroups,
  collapsed,
}: SidebarNavItemViewProps): ReactElement => {
  const ownActive = isNavItemActive(href, navigation.pathname, navigation.isActive);
  const descendantActive = hasActiveDescendant(items, navigation.pathname, navigation.isActive);
  const isCurrentPage = ownActive && !descendantActive;
  const hasChildren = !collapsed && (items?.length ?? 0) > 0;
  const extraIndentRem = depth * 0.875;
  const indent =
    collapsed || extraIndentRem === 0
      ? undefined
      : { paddingLeft: `calc(0.875rem + ${extraIndentRem}rem)` };

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    navigation.navigate(href);
  };

  const linkBody = (
    <>
      {Icon && <Icon className="size-[18px] shrink-0" />}
      <span className={cx("truncate", collapsed && "sr-only")}>{label}</span>
    </>
  );

  const { LinkComponent } = navigation;

  const link = LinkComponent ? (
    <LinkComponent
      href={href}
      isActive={isCurrentPage}
      isAncestorActive={descendantActive}
      collapsed={collapsed}
      baseClassName={cx(navLinkBaseClass, collapsed ? navLinkCollapsedClass : navLinkExpandedClass)}
      activeClassName={navLinkActiveClass}
      ancestorClassName={navLinkAncestorActiveClass}
      inactiveClassName={navLinkInactiveClass}
      title={collapsed ? label : undefined}
      style={indent}
    >
      {linkBody}
    </LinkComponent>
  ) : (
    <a
      href={href}
      onClick={handleLinkClick}
      aria-current={isCurrentPage ? "page" : undefined}
      title={collapsed ? label : undefined}
      style={indent}
      className={cx(
        navLinkBaseClass,
        collapsed ? navLinkCollapsedClass : navLinkExpandedClass,
        isCurrentPage
          ? navLinkActiveClass
          : descendantActive
            ? navLinkAncestorActiveClass
            : navLinkInactiveClass,
      )}
    >
      {linkBody}
    </a>
  );

  if (!hasChildren) {
    return <li>{link}</li>;
  }

  const expanded = expandedGroups.isExpanded(id);
  const submenuId = `${id}-submenu`;

  return (
    <li>
      <div className="flex items-center gap-1">
        {link}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={submenuId}
          onClick={() => expandedGroups.toggle(id)}
          className={toggleButtonClass}
        >
          <ChevronIcon expanded={expanded} />
          <span className="sr-only">{expanded ? `Collapse ${label}` : `Expand ${label}`}</span>
        </button>
      </div>
      <ul id={submenuId} hidden={!expanded} className="mt-1 space-y-1">
        {items?.map((child) => (
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
