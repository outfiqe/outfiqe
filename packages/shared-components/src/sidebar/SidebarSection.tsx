import type { ReactElement } from "react";

import { SidebarNavItemView } from "./SidebarNavItemView";
import { sectionHeadingClass } from "./styles";
import type { SidebarNavSection, SidebarNavigationAdapter } from "./types";
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
    <div className="space-y-1">
      {section.label && !collapsed && (
        <h3 id={headingId} className={sectionHeadingClass}>
          {section.label}
        </h3>
      )}
      <ul aria-labelledby={headingId} className="space-y-1">
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
