"use client";

import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import Link from "next/link";
import { useState } from "react";

import { RIDER_STOP_DIRECTION } from "../api/riderSchemas";
import { PENDING_SCAN_STATE } from "../constants/pendingScans";
import { OPEN_RIDER_TASK_STATUSES, RIDER_TASK_STATUS_LABELS } from "../constants/riderTaskLabels";
import { usePendingScans } from "../context/PendingScansContext";
import { useRiderTask } from "../hooks/useRiderTask";
import { describeRiderLoadError } from "../utils/riderLoadError.utils";
import {
  buildMapsLink,
  countCollectedStops,
  describeItemCount,
  formatShortOrderId,
} from "../utils/riderTask.utils";
import { CollectScanFlow } from "./CollectScanFlow";
import { LeaveVisitModal } from "./LeaveVisitModal";
import { PendingScansList } from "./PendingScansList";
import { ReturnStopsSection } from "./ReturnStopsSection";
import { WastedVisitModal } from "./WastedVisitModal";

const NOTHING_COLLECTED = 0;
const SINGLE_SCAN = 1;
const VISIT_NO_SIGNAL_MESSAGE = "We couldn't load this visit. Check your signal and try again.";

type RiderVisitPageProps = { taskId: string };

export const RiderVisitPage = ({ taskId }: RiderVisitPageProps) => {
  const { data: task, isPending, isError, error } = useRiderTask(taskId);
  const { pendingScans } = usePendingScans();
  const [isWastedModalOpen, setIsWastedModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const scansWaitingToSendCount = pendingScans.filter(
    (pendingScan) =>
      pendingScan.taskId === taskId && pendingScan.state === PENDING_SCAN_STATE.WAITING,
  ).length;

  if (isError) {
    return <FormBanner>{describeRiderLoadError(error, VISIT_NO_SIGNAL_MESSAGE)}</FormBanner>;
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
  const collectStops = stops.filter(({ direction }) => direction === RIDER_STOP_DIRECTION.COLLECT);
  const returnStops = stops.filter(({ direction }) => direction === RIDER_STOP_DIRECTION.RETURN);
  const collectedCount = countCollectedStops({ stops: collectStops });
  const isOpen = OPEN_RIDER_TASK_STATUSES.has(status);
  const hasUncollectedBags = collectedCount < collectStops.length;
  const hasUnfinishedStops = countCollectedStops(task) < stops.length;
  const hasDoneNothing = countCollectedStops(task) === NOTHING_COLLECTED;
  const hasScansWaitingToSend = scansWaitingToSendCount > NOTHING_COLLECTED;

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

      {returnStops.length > NOTHING_COLLECTED && (
        <ReturnStopsSection taskId={taskId} returnStops={returnStops} isVisitOpen={isOpen} />
      )}

      {collectStops.length > NOTHING_COLLECTED && (
        <section aria-labelledby="bags-heading" className="mt-4">
          <h2 id="bags-heading" className="font-semibold text-foreground">
            Bags: {collectedCount} of {collectStops.length} collected
          </h2>
          <ul className="mt-2 space-y-2">
            {collectStops.map((stop) => (
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
      )}

      {isOpen ? (
        <div className="mt-4 space-y-3">
          {hasUncollectedBags && <CollectScanFlow taskId={taskId} />}
          {hasScansWaitingToSend ? (
            <p className="rounded-2xl bg-muted p-4 text-sm text-foreground">
              {scansWaitingToSendCount === SINGLE_SCAN
                ? "1 scan is saved on this phone and hasn't sent yet."
                : `${scansWaitingToSendCount} scans are saved on this phone and haven't sent yet.`}{" "}
              Finish the visit once they&apos;ve sent, so none of your bags are lost.
            </p>
          ) : hasDoneNothing ? (
            <Button variant="ghost" onClick={() => setIsWastedModalOpen(true)}>
              Nothing to collect here
            </Button>
          ) : (
            hasUnfinishedStops && (
              <Button variant="outline" onClick={() => setIsLeaveModalOpen(true)}>
                Leave without the rest
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
      <LeaveVisitModal
        taskId={taskId}
        uncollectedBagCount={collectStops.length - collectedCount}
        open={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
      />
    </>
  );
};
