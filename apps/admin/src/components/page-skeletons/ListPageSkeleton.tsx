import { ShimmerBlock } from "./ShimmerBlock";

const FILTER_CHIP_COUNT = 4;
const LIST_ROW_COUNT = 6;

export const ListPageSkeleton = () => (
  <div role="status">
    <ShimmerBlock className="h-8 w-40" />
    <div className="mt-5 flex flex-wrap gap-2">
      {Array.from({ length: FILTER_CHIP_COUNT }, (_unused, chipIndex) => (
        <ShimmerBlock key={chipIndex} className="h-8 w-24 rounded-full" />
      ))}
    </div>
    <div className="mt-6 space-y-3">
      {Array.from({ length: LIST_ROW_COUNT }, (_unused, rowIndex) => (
        <ShimmerBlock key={rowIndex} className="h-24 w-full rounded-xl" />
      ))}
    </div>
    <span className="sr-only">Loading page</span>
  </div>
);
