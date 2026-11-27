import { Badge, Button, toast } from "@outfiqe/design-system";
import { RefundDestinationKind } from "@outfiqe/types";
import { formatDate, formatOrderReference } from "@outfiqe/utils";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";

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
  const markPaidHintId = useId();

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-foreground">
            <span className="block text-xs font-medium text-muted-foreground">
              Order {formatOrderReference(orderId)}
            </span>
            <span>
              Rs. {totalAmount.toLocaleString()} to {customerName}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {customerPhone} · paid by {paymentMethod} · {REFUND_CAUSE_LABELS[cause]} ·{" "}
            {formatDate(createdAt)}
          </p>
          <p className="text-sm text-muted-foreground">{reason}</p>
        </div>
        <Badge tone={destination ? "neutral" : "negative"} showDot={false}>
          {destination ? "Ready to pay" : "Waiting for details"}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
        <RefundDestinationDetails refund={refund} />
        <div className="ml-auto flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/orders/$orderId" params={{ orderId }}>
                Open order
              </Link>
            </Button>
            {canManage && (
              <Button
                size="sm"
                onClick={() => onMarkPaid(refund)}
                disabled={!destination}
                aria-describedby={destination ? undefined : markPaidHintId}
              >
                Mark as paid
              </Button>
            )}
          </div>
          {canManage && !destination && (
            <p id={markPaidHintId} className="text-xs text-muted-foreground">
              Available once the customer adds where to send it.
            </p>
          )}
        </div>
      </div>
    </article>
  );
};
