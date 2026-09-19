import { Skeleton } from "@outfiqe/design-system";

const DEFAULT_COLUMN_COUNT = 4;
const CARDS_PER_COLUMN = 3;

type KanbanBoardSkeletonProps = {
  columnCount?: number;
};

export const KanbanBoardSkeleton = ({
  columnCount = DEFAULT_COLUMN_COUNT,
}: KanbanBoardSkeletonProps) => (
  <div className="flex gap-4 overflow-x-auto pb-2" role="status" aria-label="Loading">
    {Array.from({ length: columnCount }, (_unused, columnIndex) => (
      <section
        key={columnIndex}
        className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-card p-3"
        aria-hidden
      >
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-4" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: CARDS_PER_COLUMN }, (_cardUnused, cardIndex) => (
            <article
              key={cardIndex}
              className="rounded-lg border border-border bg-background p-3 text-sm shadow-sm"
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-1 h-4 w-24" />
              <div className="mt-2 flex items-center gap-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-6 flex-1 rounded-md" />
              </div>
            </article>
          ))}
        </div>
      </section>
    ))}
  </div>
);
