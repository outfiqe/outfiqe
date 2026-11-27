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
import { OrderRefundCause } from "@outfiqe/types";
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
const DECLINE_REFUND_LABEL = "Don't refund";
const [DEFAULT_STAFF_REFUND_CAUSE] = STAFF_REFUND_CAUSES;

type RefundItemsModalProps = {
  orderId: string;
  items: OrderItem[];
  isCashParcelOnTheWay: boolean;
  onClose: () => void;
};

const unitsNotYetRefunded = (item: OrderItem) => item.qty - item.refundedQty;

const formatRupees = (amount: number) => `Rs. ${amount.toLocaleString()}`;

export const RefundItemsModal = ({
  orderId,
  items,
  isCashParcelOnTheWay,
  onClose,
}: RefundItemsModalProps) => {
  const refundItems = useRefundOrderItems(orderId);
  const [chosenUnitsByItemId, setChosenUnitsByItemId] = useState<Record<string, number>>({});
  const [cause, setCause] = useState<StaffRefundCause>(DEFAULT_STAFF_REFUND_CAUSE);
  const [reason, setReason] = useState("");
  const [shouldRestock, setShouldRestock] = useState(false);
  const fieldIdPrefix = useId();
  const restockHintId = `${fieldIdPrefix}-restock-hint`;
  const refundableItems = items.filter((item) => unitsNotYetRefunded(item) > NOTHING_CHOSEN);
  const lines = Object.entries(chosenUnitsByItemId)
    .filter(([, qty]) => qty > NOTHING_CHOSEN)
    .map(([orderItemId, qty]) => ({ orderItemId, qty }));
  const chosenItemsAmount = refundableItems.reduce(
    (runningTotal, item) =>
      runningTotal + item.unitPrice * (chosenUnitsByItemId[item.id] ?? NOTHING_CHOSEN),
    NOTHING_CHOSEN,
  );
  const trimmedReason = reason.trim();
  const isBlockedWhileOnTheWay = isCashParcelOnTheWay && cause !== OrderRefundCause.PARTNER_FAILED;
  const canSubmit =
    lines.length > NOTHING_CHOSEN &&
    trimmedReason.length >= REFUND_REASON_MIN_LENGTH &&
    !isBlockedWhileOnTheWay;

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
      {isBlockedWhileOnTheWay && (
        <FormBanner tone="neutral" className="mb-4">
          This cash-on-delivery parcel is on its way, so the shopper hasn&apos;t paid yet. Refund it
          now only if the delivery partner lost or damaged it (choose that reason below). If the
          shopper refuses it, mark the order returned once it&apos;s back. Anything else can wait
          until it&apos;s delivered.
        </FormBanner>
      )}
      {refundableItems.length === NOTHING_CHOSEN ? (
        <p className="text-sm text-muted-foreground">
          Every item on this order is already refunded.
        </p>
      ) : (
        <ul className="space-y-3">
          {refundableItems.map((item) => {
            const productNameId = `${fieldIdPrefix}-name-${item.id}`;
            const quantityLabelId = `${fieldIdPrefix}-qty-label-${item.id}`;
            const quantityInputId = `${fieldIdPrefix}-qty-${item.id}`;
            const refundableUnits = unitsNotYetRefunded(item);
            const chosenUnits = chosenUnitsByItemId[item.id] ?? NOTHING_CHOSEN;
            return (
              <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <div id={productNameId} className="text-foreground">
                  {item.productName} · {item.sizeLabel}
                  <span className="block text-xs text-muted-foreground">
                    {item.brandName} · {formatRupees(item.unitPrice)} each
                  </span>
                </div>
                <div className="w-36 shrink-0">
                  <Label id={quantityLabelId} htmlFor={quantityInputId}>
                    Units to refund
                  </Label>
                  <Select
                    id={quantityInputId}
                    aria-labelledby={`${productNameId} ${quantityLabelId}`}
                    value={chosenUnits}
                    onChange={(event) =>
                      setChosenUnitsByItemId((current) => ({
                        ...current,
                        [item.id]: Number(event.target.value),
                      }))
                    }
                  >
                    {Array.from({ length: refundableUnits + NONE_OPTION_COUNT }, (_, units) => (
                      <option key={units} value={units}>
                        {units === NOTHING_CHOSEN
                          ? DECLINE_REFUND_LABEL
                          : `${units} of ${refundableUnits}`}
                      </option>
                    ))}
                  </Select>
                  {chosenUnits > NOTHING_CHOSEN && (
                    <p className="mt-1 text-right text-xs font-medium text-foreground">
                      {formatRupees(item.unitPrice * chosenUnits)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {refundableItems.length > NOTHING_CHOSEN && (
        <div className="mt-4 rounded-lg border border-border p-3 text-sm" aria-live="polite">
          <p className="font-medium text-foreground">
            Items to refund: {formatRupees(chosenItemsAmount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Delivery and cash-on-delivery fees come back only when this refund leaves nothing on the
            order and the reason below returns fees. The recorded amount is worked out when you
            refund, so it can be lower for a discounted item.
          </p>
        </div>
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
        <div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <Checkbox
              aria-describedby={restockHintId}
              checked={shouldRestock}
              onChange={(event) => setShouldRestock(event.target.checked)}
            />
            Put these units back on sale
          </label>
          <p id={restockHintId} className="mt-1 pl-6 text-xs text-muted-foreground">
            Adds the refunded units back to the product&apos;s stock so shoppers can buy them again.
            Leave it off for damaged or lost items.
          </p>
        </div>
      </div>
    </Modal>
  );
};
