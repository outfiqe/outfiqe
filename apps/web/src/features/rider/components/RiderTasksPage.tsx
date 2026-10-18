"use client";

import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";

import { useRiderTasks } from "../hooks/useRiderTasks";
import { PendingScansList } from "./PendingScansList";
import { RiderTaskCard } from "./RiderTaskCard";

const LOADING_CARD_COUNT = 3;
const NO_TASKS = 0;

export const RiderTasksPage = () => {
  const { data: tasks, isPending, isError, refetch } = useRiderTasks();

  return (
    <>
      <PendingScansList />
      <h1 className="font-display text-2xl font-bold text-foreground">Today&apos;s visits</h1>

      {isError && (
        <div className="mt-4 space-y-3">
          <FormBanner>
            We couldn&apos;t load your visits. Check your signal and try again.
          </FormBanner>
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      )}

      {isPending && (
        <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading visits">
          {Array.from({ length: LOADING_CARD_COUNT }, (_, cardIndex) => (
            <Skeleton key={cardIndex} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {tasks?.length === NO_TASKS && (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No visits for you right now. Your hub lead will assign the next round.
        </p>
      )}

      {tasks && tasks.length > NO_TASKS && (
        <ul className="mt-4 space-y-3">
          {tasks.map((task) => (
            <li key={task.id}>
              <RiderTaskCard task={task} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
};
