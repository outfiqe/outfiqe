import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";

import { useInfiniteRiderTasks } from "../hooks/useInfiniteRiderTasks";
import { RiderTaskRow } from "./RiderTaskRow";

const LOADING_ROW_COUNT = 3;
const NO_TASKS = 0;

type RiderTasksSectionProps = {
  hubId: string;
  canManage: boolean;
};

export const RiderTasksSection = ({ hubId, canManage }: RiderTasksSectionProps) => {
  const tasksQuery = useInfiniteRiderTasks(hubId);
  const tasks = tasksQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-labelledby="rider-visits-heading" className="space-y-3">
      <h2 id="rider-visits-heading" className="text-lg font-semibold text-foreground">
        Rider visits
      </h2>

      {tasksQuery.isError && <FormBanner>We couldn&apos;t load the rider visits.</FormBanner>}

      {tasksQuery.isPending && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading rider visits">
          {Array.from({ length: LOADING_ROW_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!tasksQuery.isPending && !tasksQuery.isError && tasks.length === NO_TASKS && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No rider visits yet.
        </p>
      )}

      <ul className="space-y-2">
        {tasks.map((task) => (
          <RiderTaskRow key={task.id} task={task} canManage={canManage} />
        ))}
      </ul>

      {tasksQuery.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void tasksQuery.fetchNextPage()}
          isLoading={tasksQuery.isFetchingNextPage}
        >
          Load more
        </Button>
      )}
    </section>
  );
};
