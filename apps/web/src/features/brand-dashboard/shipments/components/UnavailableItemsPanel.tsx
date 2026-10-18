"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import type { BrandShipmentItem } from "../api/brandFulfilmentSchemas";
import { UNAVAILABLE_ITEM_STATUS_LABELS } from "../constants/unavailableItemLabels";
import { useUnavailableItemReports } from "../hooks/useUnavailableItemReports";
import { ReportUnavailableItemsModal } from "./ReportUnavailableItemsModal";

const NO_REPORTS = 0;

type UnavailableItemsPanelProps = {
  groupId: string;
  items: BrandShipmentItem[];
  canReport: boolean;
};

export const UnavailableItemsPanel = ({
  groupId,
  items,
  canReport,
}: UnavailableItemsPanelProps) => {
  const { data: reports, isPending, isError } = useUnavailableItemReports(groupId);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const hasReports = reports !== undefined && reports.length > NO_REPORTS;

  if (!canReport && !hasReports) return null;

  return (
    <section
      aria-labelledby="unavailable-items-heading"
      className="rounded-2xl border border-border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="unavailable-items-heading" className="text-sm font-semibold text-foreground">
          Items you can&apos;t supply
        </h2>
        {canReport && (
          <Button size="sm" variant="outline" onClick={() => setIsReportModalOpen(true)}>
            Can&apos;t supply an item
          </Button>
        )}
      </div>

      {isPending ? (
        <Skeleton className="mt-3 h-12 w-full rounded-lg" />
      ) : isError ? (
        <p role="alert" className="mt-3 text-sm text-muted-foreground">
          We couldn&apos;t load your reports right now.
        </p>
      ) : hasReports ? (
        <ul className="mt-3 space-y-2 text-sm">
          {reports.map(({ id, productName, sizeLabel, qty, reason, status, decisionNote }) => (
            <li key={id} className="border-t border-border pt-2 first:border-t-0 first:pt-0">
              <div className="flex justify-between gap-3">
                <span className="text-foreground">
                  {productName} · {sizeLabel} × {qty}
                </span>
                <span className="text-muted-foreground">
                  {UNAVAILABLE_ITEM_STATUS_LABELS[status]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{reason}</p>
              {decisionNote && (
                <p className="text-xs text-muted-foreground">Outfiqe: {decisionNote}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          If you run out of something in this order, tell us here instead of cancelling the whole
          order.
        </p>
      )}

      {isReportModalOpen && (
        <ReportUnavailableItemsModal
          groupId={groupId}
          items={items}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </section>
  );
};
