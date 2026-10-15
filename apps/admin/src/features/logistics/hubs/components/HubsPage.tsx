import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { useHubs } from "../hooks/useHubs";
import { HubCard } from "./HubCard";
import { HubFormModal } from "./HubFormModal";

const LOADING_CARD_COUNT = 2;
const NO_HUBS = 0;

export const HubsPage = () => {
  const { canUse } = usePlatformPermissions();
  const canManageHubs = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);
  const { data: hubs, isPending, isError, refetch } = useHubs();
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Hubs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Outfiqe&apos;s warehouses: their hours, pickup rounds and the areas riders collect from.
          </p>
        </div>
        {canManageHubs && (
          <Button type="button" onClick={() => setIsAddOpen(true)}>
            Add hub
          </Button>
        )}
      </div>

      {isError && (
        <FormBanner>
          We couldn&apos;t load the hubs.{" "}
          <button type="button" className="cursor-pointer underline" onClick={() => refetch()}>
            Try again
          </button>
        </FormBanner>
      )}

      {isPending && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading hubs">
          {Array.from({ length: LOADING_CARD_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isPending && !isError && (hubs?.length ?? NO_HUBS) === NO_HUBS && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No hubs yet.
        </p>
      )}

      <div className="space-y-3">
        {hubs?.map((hub) => (
          <HubCard key={hub.id} hub={hub} canManage={canManageHubs} />
        ))}
      </div>

      {isAddOpen && <HubFormModal onClose={() => setIsAddOpen(false)} />}
    </div>
  );
};
