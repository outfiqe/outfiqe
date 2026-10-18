import { useState } from "react";

import type { Hub } from "../hubs/api/hubsSchemas";
import { useHubs } from "../hubs/hooks/useHubs";

export const useSelectedHub = () => {
  const { data: hubs, isPending, isError, refetch } = useHubs();
  const [chosenHubId, setChosenHubId] = useState<string | null>(null);
  const openHubs = hubs?.filter((hub) => hub.isActive) ?? [];
  const selectedHub: Hub | null =
    openHubs.find((hub) => hub.id === chosenHubId) ?? openHubs[0] ?? null;

  return {
    openHubs,
    selectedHub,
    selectHub: setChosenHubId,
    isLoadingHubs: isPending,
    hasHubsError: isError,
    retryHubs: () => void refetch(),
  };
};
