import { z } from "zod";

import { optionalWholeNumberText, wholeNumberText } from "@/lib/formFields";

const MAX_TIER_AMOUNT = 1_000_000_000;

export const tierFormSchema = z
  .object({
    minPrice: wholeNumberText("a minimum price", { max: MAX_TIER_AMOUNT }),
    maxPrice: optionalWholeNumberText(),
    amount: wholeNumberText("a commission amount", { max: MAX_TIER_AMOUNT }).refine(
      (raw) => raw === "" || Number(raw) > 0,
      { message: "Commission must be at least Rs. 1." },
    ),
    sortOrder: optionalWholeNumberText(),
  })
  .refine(
    (values) =>
      values.maxPrice === "" ||
      values.minPrice === "" ||
      Number(values.maxPrice) > Number(values.minPrice),
    { message: "Max price must be greater than min price.", path: ["maxPrice"] },
  );
export type TierFormValues = z.infer<typeof tierFormSchema>;

export const EMPTY_TIER_FORM: TierFormValues = {
  minPrice: "",
  maxPrice: "",
  amount: "",
  sortOrder: "",
};
