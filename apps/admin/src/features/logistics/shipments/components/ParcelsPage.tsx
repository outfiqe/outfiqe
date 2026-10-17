import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";

import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";
import { oneOfFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { HubPicker } from "../../components/HubPicker";
import { NoOpenHubsNotice } from "../../components/NoOpenHubsNotice";
import { useSelectedHub } from "../../hooks/useSelectedHub";
import { PARCEL_QUEUES, type ParcelQueue } from "../api/parcelsSchemas";
import { PARCEL_QUEUE_LABELS } from "../constants/parcelLabels";
import { useInfiniteParcels } from "../hooks/useInfiniteParcels";
import { ParcelCard } from "./ParcelCard";

const [DEFAULT_QUEUE] = PARCEL_QUEUES;
const PARCEL_QUEUE_FILTER = oneOfFilter<ParcelQueue>([...PARCEL_QUEUES], DEFAULT_QUEUE);
const LOADING_CARD_COUNT = 3;
const NO_PARCELS = 0;

const EMPTY_QUEUE_MESSAGES: Record<ParcelQueue, string> = {
  TO_BOOK: "Every packed parcel is booked.",
  TO_HAND_OVER: "Nothing waiting for a partner to collect.",
  WITH_PARTNER: "No parcels are out with partners.",
  FINISHED: "No finished parcels yet.",
};

export const ParcelsPage = () => {
  const { canUse } = usePlatformPermissions();
  const canManage = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);
  const [queue, setQueue] = useSearchFilter("queue", PARCEL_QUEUE_FILTER);
  const { openHubs, selectedHub, selectHub, isLoadingHubs } = useSelectedHub();
  const parcelsQuery = useInfiniteParcels(selectedHub?.id ?? null, queue);
  const parcels = parcelsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isLoading = isLoadingHubs || (selectedHub !== null && parcelsQuery.isPending);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Parcels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Book packed parcels with a partner, print labels and follow them to the customer.
        </p>
      </div>

      {!isLoadingHubs && !selectedHub && <NoOpenHubsNotice />}
      {selectedHub && (
        <HubPicker openHubs={openHubs} selectedHubId={selectedHub.id} onSelectHub={selectHub} />
      )}

      <div className="flex flex-wrap gap-2">
        {PARCEL_QUEUES.map((tabQueue) => (
          <button
            key={tabQueue}
            type="button"
            onClick={() => setQueue(tabQueue)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              queue === tabQueue
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {PARCEL_QUEUE_LABELS[tabQueue]}
          </button>
        ))}
      </div>

      {parcelsQuery.isError && <FormBanner>We couldn&apos;t load these parcels.</FormBanner>}
      {isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading parcels">
          {Array.from({ length: LOADING_CARD_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      )}
      {selectedHub && !isLoading && !parcelsQuery.isError && parcels.length === NO_PARCELS && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {EMPTY_QUEUE_MESSAGES[queue]}
        </p>
      )}

      <div className="space-y-3">
        {parcels.map((parcel) => (
          <ParcelCard key={parcel.shipmentId} parcel={parcel} canManage={canManage} />
        ))}
      </div>

      {parcelsQuery.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void parcelsQuery.fetchNextPage()}
          isLoading={parcelsQuery.isFetchingNextPage}
          className="mx-auto"
        >
          Load more
        </Button>
      )}
    </div>
  );
};
