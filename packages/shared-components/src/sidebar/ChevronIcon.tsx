import type { ReactElement } from "react";

import { cx } from "./cx";

export const ChevronIcon = ({ expanded }: { expanded: boolean }): ReactElement => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    className={cx("size-3.5 shrink-0 transition-transform", expanded && "rotate-90")}
  >
    <path
      d="M6 3.5l5 4.5-5 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
