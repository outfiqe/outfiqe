import { Badge, Button, toast } from "@outfiqe/design-system";
import { RefundDestinationKind } from "@outfiqe/types";
import { formatDate } from "@outfiqe/utils";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { refundsApi } from "../api/refundsApi";
import type { RefundQueueItem } from "../api/refundsSchemas";
import { REFUND_CAUSE_LABELS, REFUND_DESTINATION_KIND_LABELS } from "../constants/refundLabels";

type RefundQueueCardProps = {
  refund: RefundQueueItem;
  canManage: boolean;
  onMarkPaid: (refund: RefundQueueItem) => void;
};

const RefundDestinationDetails = ({ refund }: { refund: RefundQueueItem }) => {
  const [revealedAccountNumber, setRevealedAccountNumber] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const { destination } = refund;

  if (!destination) {
    return (
      <p className="text-sm text-muted-foreground">
        Waiting for the customer to add where to send it. They get a reminder every few days.
      </p>
    );
  }

  const { kind, walletId, bankName, accountName, accountNumberLast4 } = destination;
  const isBank = kind === RefundDestinationKind.BANK;

  const revealAccountNumber = async () => {
    setIsRevealing(true);
    try {
      setRevealedAccountNumber(await refundsApi.revealAccountNumber(refund.id));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <div className="text-sm">
      <p className="text-foreground">
        {isBank
          ? `${bankName ?? REFUND_DESTINATION_KIND_LABELS[kind]} · ${revealedAccountNumber ?? `ending ${accountNumberLast4 ?? ""}`}`
          : `${REFUND_DESTINATION_KIND_LABELS[kind]} · ${walletId ?? ""}`}
      </p>
      <p className="text-muted-foreground">Account holder: {accountName}</p>
      {isBank && revealedAccountNumber === null && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => void revealAccountNumber()}
          isLoading={isRevealing}
        >
          Show full account number
        </Button>
      )}
    </div>
  );
};

export const RefundQueueCard = ({ refund, canManage, onMarkPaid }: RefundQueueCardProps) => {
  const {
    orderId,
    customerName,
    customerPhone,
    paymentMethod,
    totalAmount,
    cause,
    reason,
    createdAt,
    destination,
  } = refund;

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-foreground">
            Rs. {totalAmount.toLocaleString()} to {customerName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {customerPhone} · paid by {paymentMethod} · {REFUND_CAUSE_LABELS[cause]} ·{" "}
            {formatDate(createdAt)}
          </p>
          <p className="text-sm text-muted-foreground">{reason}</p>
          <Link
            to="/orders/$orderId"
            params={{ orderId }}
            className="mt-1 inline-block text-sm font-medium text-foreground underline"
          >
            Open order
          </Link>
        </div>
        <Badge tone={destination ? "neutral" : "negative"} showDot={false}>
          {destination ? "Ready to pay" : "Waiting for details"}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
        <RefundDestinationDetails refund={refund} />
        {canManage && (
          <Button size="sm" onClick={() => onMarkPaid(refund)} disabled={!destination}>
            Mark as paid
          </Button>
        )}
      </div>
    </article>
  );
};
