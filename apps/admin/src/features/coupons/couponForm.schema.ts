import { z } from "zod";

import { optionalWholeNumberText, wholeNumberText } from "@/lib/formFields";

import { couponTypeSchema } from "./schemas";

export const COUPON_CODE_MIN_LENGTH = 4;
export const COUPON_CODE_MAX_LENGTH = 24;
const MAX_COUPON_AMOUNT = 10_000_000;
const MAX_PERCENT_OFF = 100;
const MIN_POSITIVE_AMOUNT = 1;
const DEFAULT_PERCENT_OFF = "10";
const DEFAULT_FIXED_AMOUNT = "200";
const DEFAULT_MIN_SUBTOTAL = "0";

const isBlankOrAtLeastOne = (raw: string) => raw === "" || Number(raw) >= MIN_POSITIVE_AMOUNT;
const AT_LEAST_ONE_MESSAGE = "Use a number that is at least 1.";
const INVALID_NUMBER_MESSAGE = "Use a valid number.";

const optionalPositiveAmountText = () =>
  optionalWholeNumberText()
    .refine(isBlankOrAtLeastOne, { message: AT_LEAST_ONE_MESSAGE })
    .refine((raw) => raw === "" || Number(raw) <= MAX_COUPON_AMOUNT, {
      message: `Use a number up to ${MAX_COUPON_AMOUNT.toLocaleString()}.`,
    });

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Enter a coupon code.")
      .min(COUPON_CODE_MIN_LENGTH, `Use at least ${COUPON_CODE_MIN_LENGTH} characters.`)
      .max(COUPON_CODE_MAX_LENGTH, `Use at most ${COUPON_CODE_MAX_LENGTH} characters.`),
    type: couponTypeSchema,
    percentOff: z.string().trim(),
    fixedAmount: z.string().trim(),
    maxDiscountAmount: optionalPositiveAmountText(),
    minSubtotal: wholeNumberText("a minimum subtotal", { max: MAX_COUPON_AMOUNT }),
    endsAt: z.string(),
    totalBudgetAmount: optionalPositiveAmountText(),
    maxRedemptions: optionalWholeNumberText().refine(isBlankOrAtLeastOne, {
      message: AT_LEAST_ONE_MESSAGE,
    }),
    firstOrderOnly: z.boolean(),
    prepaidOnly: z.boolean(),
    stacksWithBrandDiscount: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.type === "PERCENT") {
      const percentResult = wholeNumberText("a percentage", { max: MAX_PERCENT_OFF }).safeParse(
        values.percentOff,
      );
      if (!percentResult.success) {
        context.addIssue({
          code: "custom",
          path: ["percentOff"],
          message: percentResult.error.issues[0]?.message ?? INVALID_NUMBER_MESSAGE,
        });
      } else if (Number(values.percentOff) < MIN_POSITIVE_AMOUNT) {
        context.addIssue({ code: "custom", path: ["percentOff"], message: AT_LEAST_ONE_MESSAGE });
      }
      return;
    }
    const amountResult = wholeNumberText("an amount", { max: MAX_COUPON_AMOUNT }).safeParse(
      values.fixedAmount,
    );
    if (!amountResult.success) {
      context.addIssue({
        code: "custom",
        path: ["fixedAmount"],
        message: amountResult.error.issues[0]?.message ?? INVALID_NUMBER_MESSAGE,
      });
    } else if (Number(values.fixedAmount) < MIN_POSITIVE_AMOUNT) {
      context.addIssue({ code: "custom", path: ["fixedAmount"], message: AT_LEAST_ONE_MESSAGE });
    }
  });
export type CouponFormValues = z.infer<typeof couponFormSchema>;

export const EMPTY_COUPON_FORM: CouponFormValues = {
  code: "",
  type: "PERCENT",
  percentOff: DEFAULT_PERCENT_OFF,
  fixedAmount: DEFAULT_FIXED_AMOUNT,
  maxDiscountAmount: "",
  minSubtotal: DEFAULT_MIN_SUBTOTAL,
  endsAt: "",
  totalBudgetAmount: "",
  maxRedemptions: "",
  firstOrderOnly: false,
  prepaidOnly: false,
  stacksWithBrandDiscount: true,
};
