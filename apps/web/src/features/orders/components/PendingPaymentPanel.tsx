"use client";

import { Button, FormBanner, Modal } from "@outfiqe/design-system";
import { useState } from "react";

import {
  isAlreadyPaidError,
  redirectToPaymentGateway,
  useInitiatePayment,
} from "@/features/payments";
import { useDelayedPending } from "@/shared/hooks/useDelayedPending";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useCancelOrder } from "../hooks/useCancelOrder";

type PendingPaymentPanelProps = {
  orderId: string;
  total: number;
  paymentMethod: string;
};

export const PendingPaymentPanel = ({
  orderId,
  total,
  paymentMethod,
}: PendingPaymentPanelProps) => {
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const resumePayment = useInitiatePayment();
  const cancelOrder = useCancelOrder(orderId);
  const showResuming = useDelayedPending(resumePayment.isPending);
  const showCancelling = useDelayedPending(cancelOrder.isPending);

  const startResume = () => resumePayment.mutate(orderId, { onSuccess: redirectToPaymentGateway });

  const resumeAlreadyPaid = isAlreadyPaidError(resumePayment.error);

  const confirmCancelOrder = () =>
    cancelOrder.mutate(undefined, { onSuccess: () => setIsConfirmingCancel(false) });

  return (
    <div className="rounded-2xl border border-border p-5">
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
        Payment not completed
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        This order is held but we haven&apos;t received the Rs. {total.toLocaleString()}{" "}
        {paymentMethod} payment yet. Finish paying to place it, or cancel to release it — you
        haven&apos;t been charged.
      </p>

      {resumePayment.isError && (
        <div className="mt-3">
          {resumeAlreadyPaid ? (
            <FormBanner tone="positive">
              This payment already went through — refreshing your order…
            </FormBanner>
          ) : (
            <FormBanner>{getErrorMessage(resumePayment.error)}</FormBanner>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button onClick={startResume} disabled={resumePayment.isPending || resumeAlreadyPaid}>
          {showResuming ? "Starting…" : "Resume payment"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsConfirmingCancel(true)}
          disabled={resumePayment.isPending || resumeAlreadyPaid}
        >
          Cancel order
        </Button>
      </div>

      <Modal
        open={isConfirmingCancel}
        onClose={() => setIsConfirmingCancel(false)}
        title="Cancel this order?"
      >
        <p className="text-sm text-muted-foreground">
          This releases the order for good. You haven&apos;t been charged, and this can&apos;t be
          undone.
        </p>

        {cancelOrder.isError && (
          <div className="mt-4">
            <FormBanner>{getErrorMessage(cancelOrder.error)}</FormBanner>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <Button
            variant="outline"
            onClick={() => setIsConfirmingCancel(false)}
            disabled={cancelOrder.isPending}
          >
            Keep order
          </Button>
          <Button onClick={confirmCancelOrder} disabled={cancelOrder.isPending}>
            {showCancelling ? "Cancelling…" : "Yes, cancel"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
