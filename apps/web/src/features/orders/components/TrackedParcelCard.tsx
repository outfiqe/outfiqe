"use client";

import { Button } from "@outfiqe/design-system";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { CustomerParcel } from "../api/trackingSchemas";
import { ReportNotReceivedModal } from "./ReportNotReceivedModal";

type TrackedParcelCardProps = { orderId: string; parcel: CustomerParcel };

export const TrackedParcelCard = ({ orderId, parcel }: TrackedParcelCardProps) => {
  const t = useTranslations("orders.tracking");
  const [isReporting, setIsReporting] = useState(false);
  const {
    shipmentId,
    trackingCode,
    partnerName,
    partnerTrackingUrl,
    canReportNotReceived,
    isReportedNotReceived,
  } = parcel;

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <p className="font-mono text-sm font-semibold text-foreground">
        {t("parcel", { code: trackingCode })}
      </p>
      {partnerName && partnerTrackingUrl && (
        <a
          href={partnerTrackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t("trackWithPartner", { partner: partnerName })}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      )}
      {isReportedNotReceived && <p className="text-sm text-muted-foreground">{t("reported")}</p>}
      {canReportNotReceived && (
        <Button size="sm" variant="outline" onClick={() => setIsReporting(true)}>
          {t("notReceived")}
        </Button>
      )}
      {isReporting && (
        <ReportNotReceivedModal
          orderId={orderId}
          shipmentId={shipmentId}
          onClose={() => setIsReporting(false)}
        />
      )}
    </div>
  );
};
