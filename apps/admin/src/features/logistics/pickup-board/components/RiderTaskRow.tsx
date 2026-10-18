import { Badge, Button } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";

import { getErrorMessage } from "@/lib/errorMessages";

import { pickupBoardApi } from "../api/pickupBoardApi";
import { RIDER_TASK_STATUS, type RiderTaskSummary } from "../api/pickupBoardSchemas";
import { PICKUP_BOARD_QUERY_KEY, RIDER_TASKS_QUERY_KEY } from "../constants/pickupBoardQueryKeys";
import { RIDER_TASK_STATUS_LABELS, RIDER_TASK_STATUS_TONES } from "../constants/riderTaskLabels";
import { formatRoundStart } from "../utils/roundTime.utils";

const NOTHING_COLLECTED = 0;

type RiderTaskRowProps = {
  task: RiderTaskSummary;
  canManage: boolean;
};

export const RiderTaskRow = ({ task, canManage }: RiderTaskRowProps) => {
  const { id, status, roundStartsAt, riderName, brandName, pickupLocationLabel } = task;
  const { stopCount, collectedCount, wastedReason } = task;
  const canCancel =
    canManage && status === RIDER_TASK_STATUS.ASSIGNED && collectedCount === NOTHING_COLLECTED;

  const cancelTask = useApiMutation({
    errorMessage: getErrorMessage,
    mutationFn: () => pickupBoardApi.cancelRiderTask(id),
    invalidateKeys: [PICKUP_BOARD_QUERY_KEY, RIDER_TASKS_QUERY_KEY],
    successMessage: "Visit cancelled. Its bags are back on the board.",
  });

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            {riderName} → {brandName}
          </p>
          <Badge tone={RIDER_TASK_STATUS_TONES[status]}>{RIDER_TASK_STATUS_LABELS[status]}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {pickupLocationLabel} · {formatRoundStart(roundStartsAt)} · {collectedCount} of{" "}
          {stopCount} collected
          {wastedReason ? ` · ${wastedReason}` : ""}
        </p>
      </div>
      {canCancel && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => cancelTask.mutate()}
          isLoading={cancelTask.isPending}
        >
          Cancel visit
        </Button>
      )}
    </li>
  );
};
