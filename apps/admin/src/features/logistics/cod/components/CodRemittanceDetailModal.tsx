import { FormBanner, Modal, Skeleton } from "@outfiqe/design-system";

import { useCodRemittance } from "../hooks/useCodRemittance";
import { formatCashAmount, formatCashDate } from "../utils/codRemittance.utils";

type CodRemittanceDetailModalProps = { remittanceId: string; onClose: () => void };

export const CodRemittanceDetailModal = ({
  remittanceId,
  onClose,
}: CodRemittanceDetailModalProps) => {
  const { data: remittance, isPending, isError } = useCodRemittance(remittanceId);

  return (
    <Modal
      open
      onClose={onClose}
      title={remittance ? `Payment ${remittance.reference}` : "Partner payment"}
      {...(remittance
        ? {
            description: `${remittance.partnerName} · arrived ${formatCashDate(remittance.receivedAt)}`,
          }
        : {})}
    >
      {isError && <FormBanner>We couldn&apos;t load this payment.</FormBanner>}
      {isPending && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading payment">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}
      {remittance && (
        <div className="space-y-3 text-sm">
          <p className="text-foreground">
            {formatCashAmount(remittance.collectedAmount)} collected −{" "}
            {formatCashAmount(remittance.partnerFeeAmount)} fees ={" "}
            <strong>{formatCashAmount(remittance.receivedAmount)}</strong> received
          </p>
          {remittance.note && <p className="text-muted-foreground">{remittance.note}</p>}
          <ul className="divide-y divide-border rounded-xl border border-border">
            {remittance.lines.map(
              ({ shipmentId, trackingCode, collectedAmount, partnerFeeAmount }) => (
                <li key={shipmentId} className="flex justify-between gap-2 p-3">
                  <span className="font-mono text-foreground">{trackingCode}</span>
                  <span className="text-muted-foreground">
                    {formatCashAmount(collectedAmount)} · fee {formatCashAmount(partnerFeeAmount)}
                  </span>
                </li>
              ),
            )}
          </ul>
          <p className="text-muted-foreground">
            Recorded by {remittance.recordedByName ?? "a removed account"} on{" "}
            {formatCashDate(remittance.createdAt)}
          </p>
        </div>
      )}
    </Modal>
  );
};
