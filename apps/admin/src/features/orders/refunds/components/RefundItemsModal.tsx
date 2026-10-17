import {
  Button,
  Checkbox,
  FormBanner,
  Label,
  Modal,
  Select,
  Textarea,
  toast,
} from "@outfiqe/design-system";
import { useId, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import type { OrderItem } from "../../api/ordersSchemas";
import {
  STAFF_REFUND_CAUSES,
  type StaffRefundCause,
  staffRefundCauseSchema,
} from "../api/refundsSchemas";
import {
  REFUND_CAUSE_LABELS,
  REFUND_REASON_MAX_LENGTH,
  REFUND_REASON_MIN_LENGTH,
} from "../constants/refundLabels";
import { useRefundOrderItems } from "../hooks/useRefundOrderItems";

const NOTHING_CHOSEN = 0;
const NONE_OPTION_COUNT = 1;
const [DEFAULT_STAFF_REFUND_CAUSE] = STAFF_REFUND_CAUSES;

type RefundItemsModalProps = {
  orderId: string;
  items: OrderItem[];
  onClose: () => void;
};

const unitsNotYetRefunded = (item: OrderItem) => item.qty - item.refundedQty;

export const RefundItemsModal = ({ orderId, items, onClose }: RefundItemsModalProps) => {
  const refundItems = useRefundOrderItems(orderId);
  const [chosenUnitsByItemId, setChosenUnitsByItemId] = useState<Record<string, number>>({});
  const [cause, setCause] = useState<StaffRefundCause>(DEFAULT_STAFF_REFUND_CAUSE);
  const [reason, setReason] = useState("");
  const [shouldRestock, setShouldRestock] = useState(false);
  const fieldIdPrefix = useId();
  const refundableItems = items.filter((item) => unitsNotYetRefunded(item) > NOTHING_CHOSEN);
  const lines = Object.entries(chosenUnitsByItemId)
    .filter(([, qty]) => qty > NOTHING_CHOSEN)
    .map(([orderItemId, qty]) => ({ orderItemId, qty }));
  const trimmedReason = reason.trim();
  const canSubmit =
    lines.length > NOTHING_CHOSEN && trimmedReason.length >= REFUND_REASON_MIN_LENGTH;

  const submitRefund = () => {
    refundItems.mutate(
      { lines, cause, reason: trimmedReason, restock: shouldRestock },
      {
        onSuccess: ({ totalAmount }) => {
          toast.success(`Refund of Rs. ${totalAmount.toLocaleString()} recorded.`);
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Refund items"
      description="Choose the units to refund. The money goes back the same way the customer paid, or to the manual refund queue when it can't."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button onClick={submitRefund} disabled={!canSubmit} isLoading={refundItems.isPending}>
            Refund
          </Button>
        </div>
      }
    >
      {refundItems.isError && <FormBanner>{getErrorMessage(refundItems.error)}</FormBanner>}
      {refundableItems.length === NOTHING_CHOSEN ? (
        <p className="text-sm text-muted-foreground">
          Every item on this order is already refunded.
        </p>
      ) : (
        <ul className="space-y-3">
          {refundableItems.map((item) => {
            const quantityInputId = `${fieldIdPrefix}-qty-${item.id}`;
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <label htmlFor={quantityInputId} className="text-foreground">
                  {item.productName} · {item.sizeLabel}
                  <span className="block text-xs text-muted-foreground">
                    {item.brandName} · Rs. {item.unitPrice.toLocaleString()} each
                  </span>
                </label>
                <Select
                  id={quantityInputId}
                  className="w-28"
                  value={chosenUnitsByItemId[item.id] ?? NOTHING_CHOSEN}
                  onChange={(event) =>
                    setChosenUnitsByItemId((current) => ({
                      ...current,
                      [item.id]: Number(event.target.value),
                    }))
                  }
                >
                  {Array.from(
                    { length: unitsNotYetRefunded(item) + NONE_OPTION_COUNT },
                    (_, units) => (
                      <option key={units} value={units}>
                        {units === NOTHING_CHOSEN ? "None" : `Refund ${units}`}
                      </option>
                    ),
                  )}
                </Select>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor={`${fieldIdPrefix}-cause`}>Why</Label>
          <Select
            id={`${fieldIdPrefix}-cause`}
            value={cause}
            onChange={(event) => {
              const parsedCause = staffRefundCauseSchema.safeParse(event.target.value);
              if (parsedCause.success) setCause(parsedCause.data);
            }}
          >
            {STAFF_REFUND_CAUSES.map((staffCause) => (
              <option key={staffCause} value={staffCause}>
                {REFUND_CAUSE_LABELS[staffCause]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${fieldIdPrefix}-reason`}>Note for the order history</Label>
          <Textarea
            id={`${fieldIdPrefix}-reason`}
            value={reason}
            maxLength={REFUND_REASON_MAX_LENGTH}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={shouldRestock}
            onChange={(event) => setShouldRestock(event.target.checked)}
          />
          Put these units back on sale
        </label>
      </div>
    </Modal>
  );
};
