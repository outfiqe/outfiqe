import { Button, FormBanner, Input, Label, Modal, Select } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useId, useState } from "react";

import type { Hub } from "../../hubs/api/hubsSchemas";
import { useActiveRiders } from "../../riders/hooks/useActiveRiders";
import { pickupBoardApi } from "../api/pickupBoardApi";
import type { PickupBoardLocation } from "../api/pickupBoardSchemas";
import { PICKUP_BOARD_QUERY_KEY, RIDER_TASKS_QUERY_KEY } from "../constants/pickupBoardQueryKeys";
import { isCompleteDateTimeLocal, roundTimeToday } from "../utils/roundTime.utils";

const NO_RIDERS = 0;
const FIRST_ROUND_INDEX = 0;

type AssignRiderModalProps = {
  hub: Hub;
  location: PickupBoardLocation;
  fulfilmentGroupIds: string[];
  onClose: () => void;
};

export const AssignRiderModal = ({
  hub,
  location,
  fulfilmentGroupIds,
  onClose,
}: AssignRiderModalProps) => {
  const { data: activeRiders, isPending: isLoadingRiders } = useActiveRiders(hub.id);
  const [chosenRiderId, setChosenRiderId] = useState("");
  const [roundStart, setRoundStart] = useState(() =>
    roundTimeToday(hub.pickupRoundTimes[FIRST_ROUND_INDEX] ?? hub.openTime, new Date()),
  );
  const riderSelectId = useId();
  const roundStartInputId = useId();
  const riderId = chosenRiderId || activeRiders?.[0]?.id || "";
  const canAssign = riderId !== "" && isCompleteDateTimeLocal(roundStart);

  const assignRider = useApiMutation({
    mutationFn: () =>
      pickupBoardApi.assignRiderTask({
        riderId,
        pickupLocationId: location.pickupLocationId,
        fulfilmentGroupIds,
        roundStartsAt: new Date(roundStart).toISOString(),
      }),
    invalidateKeys: [PICKUP_BOARD_QUERY_KEY, RIDER_TASKS_QUERY_KEY],
    successMessage: "Visit assigned.",
    onSuccess: onClose,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Assign a rider to ${location.brandName}`}
      description={`${fulfilmentGroupIds.length} bag(s) at ${location.label}, ${location.city}.`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => assignRider.mutate()}
            disabled={!canAssign}
            isLoading={assignRider.isPending}
          >
            Assign visit
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {!isLoadingRiders && (activeRiders?.length ?? NO_RIDERS) === NO_RIDERS && (
          <FormBanner>No active riders at {hub.name}. Invite or activate one first.</FormBanner>
        )}
        <div>
          <Label htmlFor={riderSelectId}>Rider</Label>
          <Select
            id={riderSelectId}
            value={riderId}
            onChange={(event) => setChosenRiderId(event.target.value)}
            disabled={isLoadingRiders}
          >
            {activeRiders?.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={roundStartInputId}>Round starts</Label>
          <Input
            id={roundStartInputId}
            type="datetime-local"
            value={roundStart}
            onChange={(event) => setRoundStart(event.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hub.pickupRoundTimes.map((roundTime) => (
              <button
                key={roundTime}
                type="button"
                className="cursor-pointer rounded-full bg-muted px-2.5 py-1 text-xs text-foreground hover:bg-border"
                onClick={() => setRoundStart(roundTimeToday(roundTime, new Date()))}
              >
                Today {roundTime}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
