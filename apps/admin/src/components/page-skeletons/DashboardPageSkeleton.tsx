import { ShimmerBlock } from "./ShimmerBlock";

const STAT_CARD_COUNT = 6;
const QUICK_ACCESS_TILE_COUNT = 6;

export const DashboardPageSkeleton = () => (
  <div role="status" className="flex flex-col gap-8">
    <div className="flex flex-col gap-2">
      <ShimmerBlock className="h-8 w-40" />
      <ShimmerBlock className="h-4 w-96 max-w-full" />
    </div>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: STAT_CARD_COUNT }, (_unused, statIndex) => (
        <ShimmerBlock key={statIndex} className="h-24 rounded-xl" />
      ))}
    </div>
    <div className="flex flex-col gap-4">
      <ShimmerBlock className="h-6 w-32" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: QUICK_ACCESS_TILE_COUNT }, (_unused, tileIndex) => (
          <ShimmerBlock key={tileIndex} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
    <ShimmerBlock className="h-64 rounded-xl" />
    <span className="sr-only">Loading page</span>
  </div>
);
