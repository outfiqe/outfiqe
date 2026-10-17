import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";

import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { HubPicker } from "../../components/HubPicker";
import { NoOpenHubsNotice } from "../../components/NoOpenHubsNotice";
import { useSelectedHub } from "../../hooks/useSelectedHub";
import { useInfinitePickupBoard } from "../hooks/useInfinitePickupBoard";
import { PickupLocationCard } from "./PickupLocationCard";
import { RiderTasksSection } from "./RiderTasksSection";

const LOADING_CARD_COUNT = 3;
const NO_LOCATIONS = 0;

export const PickupBoardPage = () => {
  const { canUse } = usePlatformPermissions();
  const canManageRounds = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);
  const { openHubs, selectedHub, selectHub, isLoadingHubs } = useSelectedHub();
  const boardQuery = useInfinitePickupBoard(selectedHub?.id ?? null);
  const locations = boardQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isLoading = isLoadingHubs || (selectedHub !== null && boardQuery.isPending);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Pickup board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bags brands have marked ready. Pick the bags at a location and give them to a rider.
        </p>
      </div>

      {!isLoadingHubs && !selectedHub && <NoOpenHubsNotice />}
      {selectedHub && (
        <HubPicker openHubs={openHubs} selectedHubId={selectedHub.id} onSelectHub={selectHub} />
      )}

      <section aria-labelledby="waiting-pickups-heading" className="space-y-3">
        <h2 id="waiting-pickups-heading" className="text-lg font-semibold text-foreground">
          Waiting for a rider
        </h2>

        {boardQuery.isError && (
          <FormBanner>
            We couldn&apos;t load the pickup board.{" "}
            <button
              type="button"
              className="cursor-pointer underline"
              onClick={() => void boardQuery.refetch()}
            >
              Try again
            </button>
          </FormBanner>
        )}

        {isLoading && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading pickup board">
            {Array.from({ length: LOADING_CARD_COUNT }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        )}

        {selectedHub && !isLoading && !boardQuery.isError && locations.length === NO_LOCATIONS && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing waiting. Every ready bag already has a rider.
          </p>
        )}

        {selectedHub &&
          locations.map((location) => (
            <PickupLocationCard
              key={location.pickupLocationId}
              hub={selectedHub}
              location={location}
              canManage={canManageRounds}
            />
          ))}

        {boardQuery.hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void boardQuery.fetchNextPage()}
            isLoading={boardQuery.isFetchingNextPage}
          >
            Load more
          </Button>
        )}
      </section>

      {selectedHub && <RiderTasksSection hubId={selectedHub.id} canManage={canManageRounds} />}
    </div>
  );
};
