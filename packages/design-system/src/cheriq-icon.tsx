import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";

type CheriqIconProps = ComponentPropsWithoutRef<"svg"> & {
  readonly isCheriqed?: boolean;
};

const CHERRY_STEMS_PATH = "M8 11.8C8.6 8.6 11 5.8 14.6 4M18.2 11.2C18.1 8.2 16.9 5.8 14.6 4";

const CHERRY_LEAF_PATH = "M14.6 4C13.4 1.1 9.3 0.9 6.9 3.1C9.2 5.8 12.7 5.9 14.6 4Z";

const LARGE_AND_SMALL_CHERRIES_PATH =
  "M12.4 16.8A5 5 0 1 0 2.4 16.8A5 5 0 1 0 12.4 16.8ZM22 15A3.8 3.8 0 1 0 14.4 15A3.8 3.8 0 1 0 22 15Z";

const CHERRY_SHINE_PATH = "M4.6 17.6A3 3 0 0 1 6.4 14.2M16.5 15.2A1.9 1.9 0 0 1 17.6 13.4";

const SHINE_STROKE_WIDTH = 1.8;

export const CheriqIcon = ({ className, isCheriqed = false, ...svgProps }: CheriqIconProps) => {
  const outlineClass = isCheriqed ? "stroke-primary" : undefined;
  const bodyClass = cn(outlineClass, isCheriqed && "fill-primary");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-cheriqed={isCheriqed}
      className={cn("shrink-0", className)}
      {...svgProps}
    >
      <path d={CHERRY_STEMS_PATH} className={outlineClass} />
      <path d={CHERRY_LEAF_PATH} className={bodyClass} />
      <path d={LARGE_AND_SMALL_CHERRIES_PATH} className={bodyClass} />
      <path
        d={CHERRY_SHINE_PATH}
        strokeWidth={SHINE_STROKE_WIDTH}
        className={isCheriqed ? "stroke-white" : undefined}
      />
    </svg>
  );
};
