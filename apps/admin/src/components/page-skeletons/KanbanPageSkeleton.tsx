import { ShimmerBlock } from "./ShimmerBlock";

const COLUMN_COUNT = 4;
const CARDS_PER_COLUMN = 3;

export const KanbanPageSkeleton = () => (
  <div role="status" className="flex flex-col gap-6">
    <ShimmerBlock className="h-8 w-40" />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: COLUMN_COUNT }, (_unused, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-3 rounded-xl border border-border p-3">
          <ShimmerBlock className="h-6 w-28" />
          {Array.from({ length: CARDS_PER_COLUMN }, (_cardUnused, cardIndex) => (
            <ShimmerBlock key={cardIndex} className="h-24 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
    <span className="sr-only">Loading page</span>
  </div>
);
