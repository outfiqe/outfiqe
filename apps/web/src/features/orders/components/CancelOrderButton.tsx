"use client";

import { Button, FormBanner, Modal } from "@outfiqe/design-system";
import { useState } from "react";

import { useDelayedPending } from "@/shared/hooks/useDelayedPending";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useCancelOrder } from "../hooks/useCancelOrder";

type CancelOrderButtonProps = {
  orderId: string;
  isMoneyUntaken: boolean;
};

export const CancelOrderButton = ({ orderId, isMoneyUntaken }: CancelOrderButtonProps) => {
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const cancelOrder = useCancelOrder(orderId);
  const showCancelling = useDelayedPending(cancelOrder.isPending);

  const confirmCancelOrder = () =>
    cancelOrder.mutate(undefined, { onSuccess: () => setIsConfirmingCancel(false) });

  return (
    <>
      <Button variant="outline" onClick={() => setIsConfirmingCancel(true)}>
        Cancel order
      </Button>

      <Modal
        open={isConfirmingCancel}
        onClose={() => setIsConfirmingCancel(false)}
        title="Cancel this order?"
      >
        <p className="text-sm text-muted-foreground">
          {isMoneyUntaken
            ? "This cancels your whole order. You haven't been charged, and this can't be undone."
            : "This cancels your whole order and refunds what you paid. This can't be undone."}
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
          <Button
            onClick={confirmCancelOrder}
            disabled={cancelOrder.isPending}
            isLoading={showCancelling}
          >
            Yes, cancel
          </Button>
        </div>
      </Modal>
    </>
  );
};
