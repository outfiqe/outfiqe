import { QrCode } from "@outfiqe/components";
import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";

import { BackLink } from "@/components/BackLink";

import { useMarkLabelPrinted } from "../hooks/useMarkLabelPrinted";
import { useParcelLabel } from "../hooks/useParcelLabel";

const LABEL_QR_SIZE_PX = 140;
const NOTHING_TO_COLLECT = 0;

type ParcelLabelPrintPageProps = { shipmentId: string };

export const ParcelLabelPrintPage = ({ shipmentId }: ParcelLabelPrintPageProps) => {
  const { data: label, isPending, isError } = useParcelLabel(shipmentId);
  const markLabelPrinted = useMarkLabelPrinted(shipmentId);

  if (isError) return <FormBanner>We couldn&apos;t load this label.</FormBanner>;
  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading label">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-[560px] w-96 rounded-xl" />
      </div>
    );
  }

  const { recipient, sender, partner, codAmountToCollect, currency } = label;
  const printLabel = () => {
    window.print();
    markLabelPrinted.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <BackLink to="/logistics/parcels/$shipmentId" params={{ shipmentId }}>
            Back to parcel
          </BackLink>
          <h1 className="mt-1 font-display text-2xl font-bold text-foreground">Parcel label</h1>
          <p className="text-sm text-muted-foreground">
            {label.isLabelUpToDate
              ? "This label matches the parcel."
              : "The cash to collect changed or the label hasn't been printed. Print it and stick the new one on."}
          </p>
        </div>
        <Button onClick={printLabel} isLoading={markLabelPrinted.isPending}>
          Print label
        </Button>
      </div>

      <div
        data-print-sheet
        data-parcel-label
        className="w-[100mm] space-y-3 border border-neutral-400 bg-white p-4 text-black"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide">Outfiqe parcel</p>
            <p className="font-mono text-xl font-bold tracking-widest">
              {label.displayTrackingCode}
            </p>
            <p className="text-xs">
              {label.parcelCount} piece(s) · {label.weightGrams} g
            </p>
          </div>
          <QrCode
            value={label.trackingCode}
            label={`Parcel ${label.displayTrackingCode}`}
            size={LABEL_QR_SIZE_PX}
          />
        </div>

        <div className="border-t border-black pt-2">
          <p className="text-[10px] uppercase tracking-wide">Deliver to</p>
          <p className="text-lg font-bold">{recipient.fullName}</p>
          <p className="text-sm font-semibold">{recipient.phone}</p>
          <p className="text-sm">
            {recipient.address}, {recipient.city}
            {recipient.landmark ? ` (${recipient.landmark})` : ""}
          </p>
        </div>

        <div className="border-t border-black pt-2">
          <p className="text-[10px] uppercase tracking-wide">Cash to collect</p>
          <p className="text-2xl font-bold">
            {codAmountToCollect > NOTHING_TO_COLLECT
              ? `${currency} ${codAmountToCollect.toLocaleString()}`
              : "Prepaid — collect nothing"}
          </p>
        </div>

        <div className="border-t border-black pt-2 text-xs">
          <p>
            Partner: {partner?.name ?? "not chosen"}
            {partner?.partnerReference ? ` · ${partner.partnerReference}` : ""}
          </p>
          <p>
            From: {sender.name}, {sender.address}, {sender.city} · {sender.phone}
          </p>
        </div>
      </div>
    </div>
  );
};
