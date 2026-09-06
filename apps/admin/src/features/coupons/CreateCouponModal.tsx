import { Button, Checkbox, Modal, Select, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { couponsApi } from "./api";
import type { CouponTypeValue } from "./schemas";

type CreateCouponModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const PERCENT_BASIS_POINTS_PER_PERCENT = 100;
const DEFAULT_PERCENT_OFF = 10;
const DEFAULT_FIXED_AMOUNT = 200;

const inputClassName =
  "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground";
const labelClassName = "mb-1.5 block text-sm font-medium text-foreground";

export const CreateCouponModal = ({ open, onClose, onCreated }: CreateCouponModalProps) => {
  const [code, setCode] = useState("");
  const [type, setType] = useState<CouponTypeValue>("PERCENT");
  const [percentOff, setPercentOff] = useState(DEFAULT_PERCENT_OFF);
  const [fixedAmount, setFixedAmount] = useState(DEFAULT_FIXED_AMOUNT);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
  const [minSubtotal, setMinSubtotal] = useState(0);
  const [endsAt, setEndsAt] = useState("");
  const [totalBudgetAmount, setTotalBudgetAmount] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);
  const [prepaidOnly, setPrepaidOnly] = useState(false);
  const [stacksWithBrandDiscount, setStacksWithBrandDiscount] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setCode("");
    setType("PERCENT");
    setPercentOff(DEFAULT_PERCENT_OFF);
    setFixedAmount(DEFAULT_FIXED_AMOUNT);
    setMaxDiscountAmount("");
    setMinSubtotal(0);
    setEndsAt("");
    setTotalBudgetAmount("");
    setMaxRedemptions("");
    setFirstOrderOnly(false);
    setPrepaidOnly(false);
    setStacksWithBrandDiscount(true);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setIsSubmitting(true);
    try {
      await couponsApi.create({
        code,
        type,
        percentBasisPoints:
          type === "PERCENT"
            ? Math.round(percentOff * PERCENT_BASIS_POINTS_PER_PERCENT)
            : undefined,
        fixedAmount: type === "FIXED" ? fixedAmount : undefined,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
        minSubtotal,
        startsAt: new Date().toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        totalBudgetAmount: totalBudgetAmount ? Number(totalBudgetAmount) : undefined,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
        firstOrderOnly,
        prepaidOnly,
        stacksWithBrandDiscount,
      });
      toast.success("Coupon created");
      onCreated();
      close();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New coupon"
      description="A platform-funded discount, deducted from the customer's total. Brand payouts are unaffected."
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={isSubmitting || code.trim().length < 4}>
            {isSubmitting ? "Creating…" : "Create coupon"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={labelClassName} htmlFor="coupon-code">
            Code
          </label>
          <input
            id="coupon-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="WELCOME300"
            className={inputClassName}
          />
        </div>

        <div>
          <label className={labelClassName} htmlFor="coupon-type">
            Discount type
          </label>
          <Select
            id="coupon-type"
            value={type}
            onChange={(event) => setType(event.target.value as CouponTypeValue)}
          >
            <option value="PERCENT">Percent off</option>
            <option value="FIXED">Fixed amount off</option>
          </Select>
        </div>

        {type === "PERCENT" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClassName} htmlFor="coupon-percent">
                Percent off
              </label>
              <input
                id="coupon-percent"
                type="number"
                min={1}
                max={100}
                value={percentOff}
                onChange={(event) => setPercentOff(Number(event.target.value))}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="coupon-max-discount">
                Cap (Rs., optional)
              </label>
              <input
                id="coupon-max-discount"
                type="number"
                min={1}
                value={maxDiscountAmount}
                onChange={(event) => setMaxDiscountAmount(event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className={labelClassName} htmlFor="coupon-fixed-amount">
              Amount off (Rs.)
            </label>
            <input
              id="coupon-fixed-amount"
              type="number"
              min={1}
              value={fixedAmount}
              onChange={(event) => setFixedAmount(Number(event.target.value))}
              className={inputClassName}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClassName} htmlFor="coupon-min-subtotal">
              Minimum subtotal (Rs.)
            </label>
            <input
              id="coupon-min-subtotal"
              type="number"
              min={0}
              value={minSubtotal}
              onChange={(event) => setMinSubtotal(Number(event.target.value))}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName} htmlFor="coupon-ends-at">
              Ends on (optional)
            </label>
            <input
              id="coupon-ends-at"
              type="date"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClassName} htmlFor="coupon-total-budget">
              Total budget (Rs., optional)
            </label>
            <input
              id="coupon-total-budget"
              type="number"
              min={1}
              value={totalBudgetAmount}
              onChange={(event) => setTotalBudgetAmount(event.target.value)}
              className={inputClassName}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Budgets over Rs. 50,000 need a second admin&apos;s approval before going live.
            </p>
          </div>
          <div>
            <label className={labelClassName} htmlFor="coupon-max-redemptions">
              Max redemptions (optional)
            </label>
            <input
              id="coupon-max-redemptions"
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(event) => setMaxRedemptions(event.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={firstOrderOnly}
              onChange={(event) => setFirstOrderOnly(event.target.checked)}
            />
            First order only
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={prepaidOnly}
              onChange={(event) => setPrepaidOnly(event.target.checked)}
            />
            Requires prepaid checkout (eSewa or Khalti)
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={stacksWithBrandDiscount}
              onChange={(event) => setStacksWithBrandDiscount(event.target.checked)}
            />
            Stacks with an active brand sale price
          </label>
        </div>
      </div>
    </Modal>
  );
};
