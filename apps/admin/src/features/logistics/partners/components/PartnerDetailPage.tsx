import { Badge, Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { useHubs } from "../../hubs/hooks/useHubs";
import { ADAPTER_LABELS, MANUAL_ADAPTER_KEY } from "../constants/partnerLabels";
import { useDeliveryPartner } from "../hooks/useDeliveryPartner";
import { PartnerAccountsSection } from "./PartnerAccountsSection";
import { PartnerAreasSection } from "./PartnerAreasSection";
import { PartnerConnectionSection } from "./PartnerConnectionSection";
import { PartnerFormModal } from "./PartnerFormModal";
import { PartnerStatusImportSection } from "./PartnerStatusImportSection";
import { PartnerStatusNamesSection } from "./PartnerStatusNamesSection";
import { PartnerWebhookReceiptsSection } from "./PartnerWebhookReceiptsSection";

type PartnerDetailPageProps = { partnerId: string };

export const PartnerDetailPage = ({ partnerId }: PartnerDetailPageProps) => {
  const { canUse } = usePlatformPermissions();
  const canManage = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);
  const { data: partner, isPending, isError } = useDeliveryPartner(partnerId);
  const { data: hubs } = useHubs();
  const [isEditing, setIsEditing] = useState(false);

  if (isError) return <FormBanner>We couldn&apos;t load this delivery partner.</FormBanner>;
  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading delivery partner">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const isConnectedPartner = partner.adapterKey !== MANUAL_ADAPTER_KEY;

  return (
    <div className="space-y-8">
      <Link
        to="/logistics/partners"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Delivery partners
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{partner.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {partner.code} · {ADAPTER_LABELS[partner.adapterKey] ?? partner.adapterKey}
            {partner.supportsCod ? " · collects cash" : " · prepaid parcels only"}
            {partner.referencePattern ? ` · numbers look like ${partner.referencePattern}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={partner.isActive ? "positive" : "neutral"} showDot={false}>
            {partner.isActive ? "Active" : "Paused"}
          </Badge>
          {canManage && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      {isConnectedPartner && <PartnerConnectionSection partner={partner} />}
      <PartnerAccountsSection partner={partner} hubs={hubs ?? []} canManage={canManage} />
      <PartnerAreasSection key={partner.zones.length} partner={partner} canManage={canManage} />
      <PartnerStatusNamesSection
        key={partner.statusMappings.length}
        partner={partner}
        canManage={canManage}
      />
      <PartnerStatusImportSection partnerId={partner.id} canManage={canManage} />
      {isConnectedPartner && (
        <PartnerWebhookReceiptsSection partnerId={partner.id} canManage={canManage} />
      )}

      {isEditing && <PartnerFormModal partner={partner} onClose={() => setIsEditing(false)} />}
    </div>
  );
};
