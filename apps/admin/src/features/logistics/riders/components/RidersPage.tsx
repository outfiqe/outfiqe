import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { HubPicker } from "../../components/HubPicker";
import { NoOpenHubsNotice } from "../../components/NoOpenHubsNotice";
import { useSelectedHub } from "../../hooks/useSelectedHub";
import { useInfiniteRiders } from "../hooks/useInfiniteRiders";
import { InviteRiderModal } from "./InviteRiderModal";
import { PendingRiderInvites } from "./PendingRiderInvites";
import { RiderCard } from "./RiderCard";

const LOADING_CARD_COUNT = 3;
const NO_RIDERS = 0;

export const RidersPage = () => {
  const { canUse } = usePlatformPermissions();
  const canManageRiders = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);
  const { openHubs, selectedHub, selectHub, isLoadingHubs } = useSelectedHub();
  const ridersQuery = useInfiniteRiders(selectedHub?.id ?? null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const riders = ridersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isLoading = isLoadingHubs || (selectedHub !== null && ridersQuery.isPending);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Riders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The people who collect bags from brands. Invite them, check IDs in person and manage
            their access.
          </p>
        </div>
        {canManageRiders && selectedHub && (
          <Button type="button" onClick={() => setIsInviteOpen(true)}>
            Invite rider
          </Button>
        )}
      </div>

      {!isLoadingHubs && !selectedHub && <NoOpenHubsNotice />}
      {selectedHub && (
        <HubPicker openHubs={openHubs} selectedHubId={selectedHub.id} onSelectHub={selectHub} />
      )}

      <PendingRiderInvites />

      {ridersQuery.isError && (
        <FormBanner>
          We couldn&apos;t load the riders.{" "}
          <button
            type="button"
            className="cursor-pointer underline"
            onClick={() => void ridersQuery.refetch()}
          >
            Try again
          </button>
        </FormBanner>
      )}

      {isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading riders">
          {Array.from({ length: LOADING_CARD_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {selectedHub && !isLoading && !ridersQuery.isError && riders.length === NO_RIDERS && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No riders at this hub yet.
        </p>
      )}

      <div className="space-y-3">
        {riders.map((rider) => (
          <RiderCard key={rider.id} rider={rider} canManage={canManageRiders} />
        ))}
      </div>

      {ridersQuery.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void ridersQuery.fetchNextPage()}
          isLoading={ridersQuery.isFetchingNextPage}
        >
          Load more
        </Button>
      )}

      {isInviteOpen && selectedHub && (
        <InviteRiderModal hub={selectedHub} onClose={() => setIsInviteOpen(false)} />
      )}
    </div>
  );
};
