import type { ReactElement } from "react";

import { cx } from "./cx";
import { SidebarNavItemView } from "./SidebarNavItemView";
import { cardClass, navListClass, sectionHeadingClass } from "./styles";
import type { SidebarNavigationAdapter, SidebarNavSection } from "./types";
import type { ExpandedGroups } from "./useExpandedGroups";

export type SidebarSectionProps = {
  readonly section: SidebarNavSection;
  readonly navigation: SidebarNavigationAdapter;
  readonly expandedGroups: ExpandedGroups;
  readonly collapsed: boolean;
};

export const SidebarSection = ({
  section,
  navigation,
  expandedGroups,
  collapsed,
}: SidebarSectionProps): ReactElement => {
  const headingId = section.label ? `${section.id}-heading` : undefined;

  return (
    <div className={cx(cardClass, "shrink-0 space-y-1")}>
      {section.label && !collapsed && (
        <h3 id={headingId} className={sectionHeadingClass}>
          {section.label}
        </h3>
      )}
      <ul aria-labelledby={headingId} className={navListClass}>
        {section.items.map((item) => (
          <SidebarNavItemView
            key={item.id}
            item={item}
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
