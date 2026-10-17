"use client";

import { QrCode } from "@outfiqe/components";
import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";

import { useBrandShipment } from "../../shipments/hooks/useBrandShipment";
import { formatShortOrderId } from "../../shipments/utils/shipmentStatus";

type PickupSlipPrintPageProps = {
  fulfilmentGroupId: string;
};

const SLIP_QR_SIZE_PX = 220;

export const PickupSlipPrintPage = ({ fulfilmentGroupId }: PickupSlipPrintPageProps) => {
  const { data: shipment, isPending, isError } = useBrandShipment(fulfilmentGroupId);

  if (isError) {
    return (
      <main className="mx-auto max-w-md p-6">
        <FormBanner>We couldn&apos;t load this pickup slip. Please try again.</FormBanner>
      </main>
    );
  }

  if (isPending || !shipment) {
    return (
      <main className="mx-auto max-w-md space-y-4 p-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-56 w-56 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </main>
    );
  }

  if (!shipment.pickupCode) {
    return (
      <main className="mx-auto max-w-md p-6">
        <FormBanner>
          This order isn&apos;t collected by Outfiqe, so it has no pickup slip.
        </FormBanner>
      </main>
    );
  }

  const totalQty = shipment.items.reduce((sum, lineItem) => sum + lineItem.qty, 0);

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="mb-4 flex justify-end print:hidden">
        <Button onClick={() => window.print()}>Print</Button>
      </div>

      <article data-print-sheet className="rounded-2xl border border-border p-6 text-black">
        <p className="text-xs uppercase tracking-widest">Outfiqe pickup slip</p>
        <h1 className="mt-1 text-xl font-bold">Order {formatShortOrderId(shipment.orderId)}</h1>

        <div className="mt-4 flex flex-col items-center">
          <QrCode
            value={shipment.pickupCode}
            label={`Pickup code ${shipment.pickupCode}`}
            size={SLIP_QR_SIZE_PX}
          />
          <p className="mt-2 font-mono text-3xl font-bold tracking-widest">{shipment.pickupCode}</p>
        </div>

        <p className="mt-4 text-sm font-semibold">
          {totalQty} {totalQty === 1 ? "item" : "items"} in this bag
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {shipment.items.map((lineItem) => (
            <li key={lineItem.id} className="flex justify-between gap-3">
              <span>{lineItem.productName}</span>
              <span>
                {lineItem.sizeLabel} × {lineItem.qty}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs">
          Hand this bag to the Outfiqe rider. They scan the code above before taking it.
        </p>
      </article>
    </main>
  );
};
