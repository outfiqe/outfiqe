import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";

import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { HubPicker } from "../../components/HubPicker";
import { NoOpenHubsNotice } from "../../components/NoOpenHubsNotice";
import { useSelectedHub } from "../../hooks/useSelectedHub";
import { useInfiniteBagTagBatches } from "../hooks/useInfiniteBagTagBatches";
import { CreateBagTagBatchForm } from "./CreateBagTagBatchForm";

const LOADING_ROW_COUNT = 3;
const NO_BATCHES = 0;

const formatBatchDate = (createdAt: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(createdAt),
  );

export const BagTagsPage = () => {
  const { canUse } = usePlatformPermissions();
  const canManageStickers = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);
  const { openHubs, selectedHub, selectHub, isLoadingHubs } = useSelectedHub();
  const batchesQuery = useInfiniteBagTagBatches(selectedHub?.id ?? null);
  const batches = batchesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isLoading = isLoadingHubs || (selectedHub !== null && batchesQuery.isPending);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Bag stickers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Print sheets of QR stickers for riders. Each sticker goes on one bag when it&apos;s
          collected.
        </p>
      </div>

      {!isLoadingHubs && !selectedHub && <NoOpenHubsNotice />}
      {selectedHub && (
        <HubPicker openHubs={openHubs} selectedHubId={selectedHub.id} onSelectHub={selectHub} />
      )}
      {selectedHub && canManageStickers && <CreateBagTagBatchForm hubId={selectedHub.id} />}

      {batchesQuery.isError && <FormBanner>We couldn&apos;t load the sticker batches.</FormBanner>}

      {isLoading && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading sticker batches">
          {Array.from({ length: LOADING_ROW_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {selectedHub && !isLoading && !batchesQuery.isError && batches.length === NO_BATCHES && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No sticker batches for this hub yet.
        </p>
      )}

      <ul className="space-y-2">
        {batches.map(({ id, tagCount, usedTagCount, createdAt }) => (
          <li
            key={id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
          >
            <p className="text-sm text-foreground">
              {tagCount} stickers · {usedTagCount} used · made {formatBatchDate(createdAt)}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/logistics/bag-tags/$batchId" params={{ batchId: id }}>
                Open sheet
              </Link>
            </Button>
          </li>
        ))}
      </ul>

      {batchesQuery.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void batchesQuery.fetchNextPage()}
          isLoading={batchesQuery.isFetchingNextPage}
        >
          Load more
        </Button>
      )}
    </div>
  );
};
