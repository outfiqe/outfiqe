import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";

import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { HubPicker } from "../../components/HubPicker";
import { NoOpenHubsNotice } from "../../components/NoOpenHubsNotice";
import { useSelectedHub } from "../../hooks/useSelectedHub";
import { useInfiniteOrdersToPack } from "../hooks/useInfiniteOrdersToPack";
import { OrderToPackCard } from "./OrderToPackCard";

const LOADING_CARD_COUNT = 3;
const NO_ORDERS = 0;

export const PackingPage = () => {
  const { canUse } = usePlatformPermissions();
  const canManage = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);
  const { openHubs, selectedHub, selectHub, isLoadingHubs, hasHubsError, retryHubs } =
    useSelectedHub();
  const ordersQuery = useInfiniteOrdersToPack(selectedHub?.id ?? null);
  const orders = ordersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isLoading = isLoadingHubs || (selectedHub !== null && ordersQuery.isPending);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Inspect and pack</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Orders with bags at the hub. Inspect each bag, then pack the order into one parcel.
        </p>
      </div>

      {!isLoadingHubs && !selectedHub && (
        <NoOpenHubsNotice hasHubsError={hasHubsError} onRetry={retryHubs} />
      )}
      {selectedHub && (
        <HubPicker openHubs={openHubs} selectedHubId={selectedHub.id} onSelectHub={selectHub} />
      )}

      {ordersQuery.isError && (
        <FormBanner>
          We couldn&apos;t load the orders to pack.{" "}
          <button
            type="button"
            className="cursor-pointer underline"
            onClick={() => void ordersQuery.refetch()}
          >
            Try again
          </button>
        </FormBanner>
      )}

      {isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading orders to pack">
          {Array.from({ length: LOADING_CARD_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      )}

      {selectedHub && !isLoading && !ordersQuery.isError && orders.length === NO_ORDERS && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nothing to pack. Bags show up here once they&apos;re checked in.
        </p>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <OrderToPackCard key={order.orderId} order={order} canManage={canManage} />
        ))}
      </div>

      {ordersQuery.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void ordersQuery.fetchNextPage()}
          isLoading={ordersQuery.isFetchingNextPage}
          className="mx-auto"
        >
          Load more
        </Button>
      )}
    </div>
  );
};
