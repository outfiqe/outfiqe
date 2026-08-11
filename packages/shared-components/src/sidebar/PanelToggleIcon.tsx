import type { ReactElement } from "react";

import { cx } from "./cx";

export const PanelToggleIcon = ({ collapsed }: { collapsed: boolean }): ReactElement => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    className={cx("size-4 shrink-0 transition-transform", collapsed && "rotate-180")}
  >
    <rect x="1.5" y="2.5" width="13" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M6 2.5v11" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M10 6l-2 2 2 2"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
