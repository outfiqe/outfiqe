import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";

type CheriqIconProps = ComponentPropsWithoutRef<"svg"> & {
  readonly isCheriqed?: boolean;
};

const CHERRY_STEMS_PATH = "M6.6 13.8C7 10 9.8 6.4 13 4.2M17.2 13.2C17.3 9.4 15.7 6.2 13 4.2";

const CHERRY_LEAF_PATH = "M13 4.2Q17.17 6.39 20.8 3.4Q16.63 1.21 13 4.2Z";

const CHERRY_LEAF_VEIN_PATH = "M13 4.2L18.46 3.64";

const DIMPLED_CHERRIES_PATH =
  "M6.6 13.8C8.01 11.79 11.3 14.13 11.3 17.2C11.3 19.8 9.2 21.9 6.6 21.9C4 21.9 1.9 19.8 1.9 17.2C1.9 14.13 5.19 11.79 6.6 13.8ZM17.2 13.2C18.61 11.2 21.9 13.53 21.9 16.6C21.9 19.2 19.8 21.3 17.2 21.3C14.6 21.3 12.5 19.2 12.5 16.6C12.5 13.53 15.79 11.2 17.2 13.2Z";

const CHERRY_SHINE_PATH =
  "M4.01 17.16A2.59 2.59 0 0 1 6.13 14.81M14.61 16.57A2.59 2.59 0 0 1 16.73 14.21";

const DETAIL_STROKE_WIDTH = 1.5;

export const CheriqIcon = ({ className, isCheriqed = false, ...svgProps }: CheriqIconProps) => {
  const outlineClass = isCheriqed ? "stroke-primary-strong" : undefined;
  const detailClass = isCheriqed ? "stroke-white" : undefined;

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
      <path
        d={CHERRY_LEAF_PATH}
        className={cn(outlineClass, isCheriqed && "fill-primary-strong")}
      />
      <path d={DIMPLED_CHERRIES_PATH} className={cn(outlineClass, isCheriqed && "fill-primary")} />
      <path d={CHERRY_SHINE_PATH} strokeWidth={DETAIL_STROKE_WIDTH} className={detailClass} />
      <path d={CHERRY_LEAF_VEIN_PATH} strokeWidth={DETAIL_STROKE_WIDTH} className={detailClass} />
    </svg>
  );
};
