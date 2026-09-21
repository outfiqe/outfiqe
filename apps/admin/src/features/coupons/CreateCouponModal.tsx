import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Checkbox,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Modal,
  Select,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useForm } from "react-hook-form";

import { getErrorMessage } from "@/lib/errorMessages";

import { couponsApi } from "./api";
import type { CouponFormValues } from "./couponForm.schema";
import { couponFormSchema, EMPTY_COUPON_FORM } from "./couponForm.schema";

type CreateCouponModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<unknown>;
};

const PERCENT_BASIS_POINTS_PER_PERCENT = 100;
const COD_COUPON_VALUE_THRESHOLD = 200;
const CREATE_COUPON_FORM_ID = "create-coupon-form";

const optionalNumber = (raw: string) => (raw === "" ? undefined : Number(raw));

const buildCreateInput = (values: CouponFormValues) => ({
  code: values.code,
  type: values.type,
  percentBasisPoints:
    values.type === "PERCENT"
      ? Number(values.percentOff) * PERCENT_BASIS_POINTS_PER_PERCENT
      : undefined,
  fixedAmount: values.type === "FIXED" ? Number(values.fixedAmount) : undefined,
  maxDiscountAmount: optionalNumber(values.maxDiscountAmount),
  minSubtotal: Number(values.minSubtotal),
  startsAt: new Date().toISOString(),
  endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
  totalBudgetAmount: optionalNumber(values.totalBudgetAmount),
  maxRedemptions: optionalNumber(values.maxRedemptions),
  firstOrderOnly: values.firstOrderOnly,
  prepaidOnly: values.prepaidOnly,
  stacksWithBrandDiscount: values.stacksWithBrandDiscount,
});

export const CreateCouponModal = ({ open, onClose, onCreated }: CreateCouponModalProps) => {
  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: EMPTY_COUPON_FORM,
    mode: "onTouched",
  });
  const { control, watch, register } = form;
  const couponType = watch("type");
  const isPrepaidOnly = watch("prepaidOnly");

  const createCoupon = useApiMutation({
    mutationFn: (values: CouponFormValues) => couponsApi.create(buildCreateInput(values)),
    successMessage: "Coupon created.",
    onSuccess: async () => {
      await onCreated();
      closeAndReset();
    },
  });

  const closeAndReset = () => {
    form.reset(EMPTY_COUPON_FORM);
    createCoupon.reset();
    onClose();
  };

  const submitCoupon = form.handleSubmit((values) => createCoupon.mutate(values));

  return (
    <Modal
      open={open}
      onClose={closeAndReset}
      title="New coupon"
      description="A platform-funded discount, deducted from the customer's total. Brand payouts are unaffected."
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={closeAndReset}>
            Cancel
          </Button>
          <Button type="submit" form={CREATE_COUPON_FORM_ID} isLoading={createCoupon.isPending}>
            Create coupon
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form id={CREATE_COUPON_FORM_ID} noValidate onSubmit={submitCoupon} className="space-y-4">
          <FormField
            control={control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input placeholder="WELCOME300" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount type</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <option value="PERCENT">Percent off</option>
                    <option value="FIXED">Fixed amount off</option>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {couponType === "PERCENT" ? (
            <div className="grid grid-cols-2 items-start gap-3">
              <FormField
                control={control}
                name="percentOff"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percent off</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="maxDiscountAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cap (Rs., optional)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : (
            <FormField
              control={control}
              name="fixedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount off (Rs.)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="grid grid-cols-2 items-start gap-3">
            <FormField
              control={control}
              name="minSubtotal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum subtotal (Rs.)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="endsAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ends on (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 items-start gap-3">
            <FormField
              control={control}
              name="totalBudgetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total budget (Rs., optional)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Budgets over Rs. 50,000 need a second admin&apos;s approval before going live.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="maxRedemptions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max redemptions (optional)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox {...register("firstOrderOnly")} />
              First order only
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox {...register("prepaidOnly")} />
              Requires prepaid checkout (eSewa or Khalti)
            </label>
            {!isPrepaidOnly && (
              <p className="pl-6 text-xs text-muted-foreground">
                Recommended above Rs. {COD_COUPON_VALUE_THRESHOLD} — a refused COD delivery still
                spends the coupon.
              </p>
            )}
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox {...register("stacksWithBrandDiscount")} />
              Stacks with an active brand sale price
            </label>
          </div>

          {createCoupon.isError && <FormBanner>{getErrorMessage(createCoupon.error)}</FormBanner>}
        </form>
      </Form>
    </Modal>
  );
};
