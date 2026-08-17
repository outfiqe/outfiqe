import type { ReactElement } from "react";

import { cx } from "./cx";
import { SidebarNavItemView } from "./SidebarNavItemView";
import { cardClass, navListClass, scrollHiddenClass, sectionHeadingClass } from "./styles";
import type { SidebarNavigationAdapter, SidebarNavSection } from "./types";
import type { ExpandedGroups } from "./useExpandedGroups";

export type SidebarSectionProps = {
  readonly section: SidebarNavSection;
  readonly navigation: SidebarNavigationAdapter;
  readonly expandedGroups: ExpandedGroups;
  readonly collapsed: boolean;
};

export const SidebarSection = ({
  section: { label, id, items },
  navigation,
  expandedGroups,
  collapsed,
}: SidebarSectionProps): ReactElement => {
  const headingId = label ? `${id}-heading` : undefined;

  return (
    <div className={cx(cardClass, "flex min-h-0 flex-1 flex-col gap-1")}>
      {label && !collapsed && (
        <h3 id={headingId} className={cx(sectionHeadingClass, "shrink-0")}>
          {label}
        </h3>
      )}
      <ul
        aria-labelledby={headingId}
        className={cx(
          navListClass,
          "min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
          scrollHiddenClass,
        )}
      >
        {items.map((navItem) => (
          <SidebarNavItemView
            key={navItem.id}
            item={navItem}
            depth={0}
            navigation={navigation}
            expandedGroups={expandedGroups}
            collapsed={collapsed}
          />
        ))}
      </ul>
    </div>
  );
};
