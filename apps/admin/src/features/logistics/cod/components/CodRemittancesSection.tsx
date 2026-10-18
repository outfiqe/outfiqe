import { Button, FormBanner, Table, type TableColumn } from "@outfiqe/design-system";
import { useState } from "react";

import type { CodRemittanceSummary } from "../api/codSchemas";
import { useInfiniteCodRemittances } from "../hooks/useInfiniteCodRemittances";
import { formatCashAmount, formatCashDate } from "../utils/codRemittance.utils";
import { CodRemittanceDetailModal } from "./CodRemittanceDetailModal";

type CodRemittancesSectionProps = { partnerId: string };

export const CodRemittancesSection = ({ partnerId }: CodRemittancesSectionProps) => {
  const remittancesQuery = useInfiniteCodRemittances(partnerId);
  const remittances = remittancesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const [openRemittanceId, setOpenRemittanceId] = useState<string | null>(null);

  const remittanceColumns: TableColumn<CodRemittanceSummary>[] = [
    {
      key: "reference",
      header: "Reference",
      render: ({ id, reference }) => (
        <button
          type="button"
          onClick={() => setOpenRemittanceId(id)}
          className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {reference}
        </button>
      ),
    },
    {
      key: "received-at",
      header: "Arrived",
      render: ({ receivedAt }) => formatCashDate(receivedAt),
    },
    { key: "parcels", header: "Parcels", render: ({ parcelCount }) => parcelCount },
    {
      key: "received",
      header: "Received",
      align: "right",
      render: ({ receivedAmount }) => formatCashAmount(receivedAmount),
    },
  ];

  return (
    <section className="space-y-3" aria-labelledby="cod-remittances-heading">
      <h2 id="cod-remittances-heading" className="text-lg font-semibold text-foreground">
        Payments received
      </h2>
      {remittancesQuery.isError && <FormBanner>We couldn&apos;t load the payments.</FormBanner>}
      <Table
        caption="Payments this partner has made to Outfiqe"
        columns={remittanceColumns}
        rows={remittances}
        rowKey={({ id }) => id}
        isLoading={remittancesQuery.isPending}
        emptyState="No payments recorded from this partner yet."
      />
      {remittancesQuery.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void remittancesQuery.fetchNextPage()}
          isLoading={remittancesQuery.isFetchingNextPage}
        >
          Show more payments
        </Button>
      )}
      {openRemittanceId && (
        <CodRemittanceDetailModal
          remittanceId={openRemittanceId}
          onClose={() => setOpenRemittanceId(null)}
        />
      )}
    </section>
  );
};
