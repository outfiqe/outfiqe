import Link from "next/link";

import type { RiderTask } from "../api/riderSchemas";
import { RIDER_TASK_STATUS_LABELS } from "../constants/riderTaskLabels";
import { countCollectedStops, formatRoundTime } from "../utils/riderTask.utils";

type RiderTaskCardProps = { task: RiderTask };

export const RiderTaskCard = ({ task }: RiderTaskCardProps) => {
  const { id, brandName, pickupLocation, roundStartsAt, status, stops } = task;

  return (
    <Link
      href={`/rider/visits/${id}`}
      className="block cursor-pointer rounded-2xl border border-border p-4 transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{brandName}</p>
          <p className="text-sm text-muted-foreground">
            {pickupLocation.label} · {pickupLocation.city}
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {RIDER_TASK_STATUS_LABELS[status]}
        </span>
      </div>
      <p className="mt-3 text-sm text-foreground">
        Round at {formatRoundTime(roundStartsAt)} · {countCollectedStops(task)} of {stops.length}{" "}
        bags collected
      </p>
    </Link>
  );
};
