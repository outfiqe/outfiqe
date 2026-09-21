import { Button, Skeleton, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";

import { SkeletonButton } from "@/components/SkeletonControls";
import { getErrorMessage } from "@/lib/errorMessages";
import { oneOfFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { creatorsApi } from "./api";
import { useInfiniteCreators } from "./hooks/useInfiniteCreators";
import type { CreatorStatusValue } from "./schemas";

const TABS: CreatorStatusValue[] = ["PENDING", "APPROVED", "REJECTED"];
const CREATORS_STATUS_FILTER = oneOfFilter<CreatorStatusValue>(TABS, "PENDING");

const CREATOR_ROW_SKELETON_COUNT = 6;
const CREATOR_ROW_CLASS =
  "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4";

const CreatorRowSkeleton = ({ hasReviewActions }: { hasReviewActions: boolean }) => (
  <div className={CREATOR_ROW_CLASS} aria-hidden>
    <div>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-1 h-5 w-56" />
    </div>
    {hasReviewActions && (
      <div className="flex gap-2">
        <SkeletonButton label="Approve" />
        <SkeletonButton variant="outline" label="Reject" />
      </div>
    )}
  </div>
);

export const CreatorsPage = () => {
  const [tab, setTab] = useSearchFilter("status", CREATORS_STATUS_FILTER);

  const {
    data: creatorsQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteCreators(tab);
  const creators = creatorsQuery?.pages.flatMap((page) => page.creators) ?? [];

  const approve = useApiMutation({
    successMessage: "Creator approved.",
    mutationFn: (userId: string) => creatorsApi.approve(userId),
    invalidateKeys: [["creators"]],
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const reject = useApiMutation({
    successMessage: "Creator rejected.",
    mutationFn: (userId: string) => creatorsApi.reject(userId),
    invalidateKeys: [["creators"]],
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Creators</h1>

      <div className="mt-5 flex gap-2">
        {TABS.map((status) => (
          <button
            key={status}
            onClick={() => setTab(status)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === status
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {status[0]}
            {status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: CREATOR_ROW_SKELETON_COUNT }, (_unused, rowIndex) => (
            <CreatorRowSkeleton key={rowIndex} hasReviewActions={tab === "PENDING"} />
          ))}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load creators.</p>}
        {!isLoading && creators.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {creators.map((creator) => {
          const { userId, name, email, creatorStatus } = creator;

          return (
            <div key={userId} className={CREATOR_ROW_CLASS}>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">{name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{email}</p>
              </div>

              {creatorStatus === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => approve.mutate(userId)}
                    disabled={approve.isPending || reject.isPending}
                    isLoading={approve.isPending && approve.variables === userId}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => reject.mutate(userId)}
                    disabled={approve.isPending || reject.isPending}
                    isLoading={reject.isPending && reject.variables === userId}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            isLoading={isFetchingNextPage}
            className="mx-auto"
          >
            Load more
          </Button>
        )}
      </div>
    </div>
  );
};
