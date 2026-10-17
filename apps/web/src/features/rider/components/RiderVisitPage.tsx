"use client";

import { Button, FormBanner, Skeleton, toast } from "@outfiqe/design-system";
import Link from "next/link";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { OPEN_RIDER_TASK_STATUSES, RIDER_TASK_STATUS_LABELS } from "../constants/riderTaskLabels";
import { useFinishVisit } from "../hooks/useFinishVisit";
import { useRiderTask } from "../hooks/useRiderTask";
import {
  buildMapsLink,
  countCollectedStops,
  describeItemCount,
  formatShortOrderId,
} from "../utils/riderTask.utils";
import { CollectScanFlow } from "./CollectScanFlow";
import { PendingScansList } from "./PendingScansList";
import { WastedVisitModal } from "./WastedVisitModal";

const NOTHING_COLLECTED = 0;

type RiderVisitPageProps = { taskId: string };

export const RiderVisitPage = ({ taskId }: RiderVisitPageProps) => {
  const { data: task, isPending, isError } = useRiderTask(taskId);
  const finishVisit = useFinishVisit(taskId);
  const [isWastedModalOpen, setIsWastedModalOpen] = useState(false);

  if (isError) {
    return <FormBanner>We couldn&apos;t load this visit. Go back and try again.</FormBanner>;
  }

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading visit">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  const { brandName, pickupLocation, stops, status } = task;
  const collectedCount = countCollectedStops(task);
  const isOpen = OPEN_RIDER_TASK_STATUSES.has(status);
  const hasUncollectedStops = collectedCount < stops.length;

  const confirmFinishVisit = () => {
    finishVisit.mutate(undefined, {
      onSuccess: () => toast.success("Visit finished. Bags not ready go back on the board."),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <>
      <Link
        href="/rider"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← All visits
      </Link>
      <PendingScansList />

      <section
        aria-labelledby="visit-heading"
        className="mt-3 rounded-2xl border border-border p-4"
      >
        <h1 id="visit-heading" className="font-display text-xl font-bold text-foreground">
          {brandName}
        </h1>
        <p className="mt-1 text-sm text-foreground">{pickupLocation.address}</p>
        {pickupLocation.landmark && (
          <p className="text-sm text-muted-foreground">Near {pickupLocation.landmark}</p>
        )}
        {pickupLocation.openingNote && (
          <p className="mt-1 text-sm text-muted-foreground">{pickupLocation.openingNote}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={`tel:${pickupLocation.contactPhoneE164}`}>Call {pickupLocation.contactName}</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={buildMapsLink(pickupLocation)} target="_blank" rel="noreferrer">
              Directions
            </a>
          </Button>
        </div>
      </section>

      <section aria-labelledby="bags-heading" className="mt-4">
        <h2 id="bags-heading" className="font-semibold text-foreground">
          Bags: {collectedCount} of {stops.length} collected
        </h2>
        <ul className="mt-2 space-y-2">
          {stops.map((stop) => (
            <li
              key={stop.id}
              className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
            >
              <span>
                Order {formatShortOrderId(stop.orderId)} · {describeItemCount(stop.itemCount)}
              </span>
              <span
                className={
                  stop.isCollected ? "font-medium text-foreground" : "text-muted-foreground"
                }
              >
                {stop.isCollected ? `Collected · ${stop.bagTagCode}` : "Waiting"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {isOpen ? (
        <div className="mt-4 space-y-3">
          {hasUncollectedStops && <CollectScanFlow taskId={taskId} />}
          {collectedCount === NOTHING_COLLECTED ? (
            <Button variant="ghost" onClick={() => setIsWastedModalOpen(true)}>
              Nothing to collect here
            </Button>
          ) : (
            hasUncollectedStops && (
              <Button
                variant="outline"
                onClick={confirmFinishVisit}
                isLoading={finishVisit.isPending}
              >
                Leave without the other bags
              </Button>
            )
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-muted p-4 text-sm text-foreground">
          This visit is {RIDER_TASK_STATUS_LABELS[status].toLowerCase()}. Take collected bags to the
          hub.
        </p>
      )}

      <WastedVisitModal
        taskId={taskId}
        open={isWastedModalOpen}
        onClose={() => setIsWastedModalOpen(false)}
      />
    </>
  );
};
