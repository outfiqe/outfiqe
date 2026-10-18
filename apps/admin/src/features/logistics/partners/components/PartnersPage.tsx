import { Badge, Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { useDeliveryPartners } from "../hooks/useDeliveryPartners";
import { PartnerFormModal } from "./PartnerFormModal";

const LOADING_CARD_COUNT = 3;
const NO_PARTNERS = 0;

export const PartnersPage = () => {
  const { canUse } = usePlatformPermissions();
  const canManage = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);
  const { data: partners, isPending, isError } = useDeliveryPartners();
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Delivery partners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The couriers that deliver parcels from the hub, where they deliver and how their status
            names map to ours.
          </p>
        </div>
        {canManage && <Button onClick={() => setIsFormOpen(true)}>Add partner</Button>}
      </div>

      {isError && <FormBanner>We couldn&apos;t load the delivery partners.</FormBanner>}
      {isPending && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading delivery partners">
          {Array.from({ length: LOADING_CARD_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}
      {!isPending && !isError && partners.length === NO_PARTNERS && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No delivery partners yet. Add one before turning on Outfiqe delivery for brands.
        </p>
      )}

      <div className="space-y-3">
        {partners?.map(({ id, name, code, isActive, supportsCod, accounts, zones }) => (
          <Link
            key={id}
            to="/logistics/partners/$partnerId"
            params={{ partnerId: id }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground"
          >
            <div>
              <h2 className="font-display text-base font-bold text-foreground">{name}</h2>
              <p className="text-sm text-muted-foreground">
                {code} · {accounts.length} hub account(s) · {zones.length} delivery area(s)
                {supportsCod ? " · collects cash" : ""}
              </p>
            </div>
            <Badge tone={isActive ? "positive" : "neutral"} showDot={false}>
              {isActive ? "Active" : "Paused"}
            </Badge>
          </Link>
        ))}
      </div>

      {isFormOpen && <PartnerFormModal partner={null} onClose={() => setIsFormOpen(false)} />}
    </div>
  );
};
