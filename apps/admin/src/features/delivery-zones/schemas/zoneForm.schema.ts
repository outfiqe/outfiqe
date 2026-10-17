import { z } from "zod";

import { optionalWholeNumberText, wholeNumberText } from "@/lib/formFields";

const ZONE_NAME_MAX_LENGTH = 120;
const MAX_FEE = 1_000_000;
const MAX_DELIVERY_DAYS = 60;

const isWithinDeliveryDayLimit = (raw: string) => raw === "" || Number(raw) <= MAX_DELIVERY_DAYS;

export const zoneFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a name for the zone.")
      .max(ZONE_NAME_MAX_LENGTH, `Use at most ${ZONE_NAME_MAX_LENGTH} characters.`),
    cities: z.array(z.string()),
    standardDeliveryFee: wholeNumberText("a standard delivery fee", { max: MAX_FEE }),
    freeDeliveryThreshold: wholeNumberText("a free delivery threshold", { max: MAX_FEE }),
    codHandlingFee: wholeNumberText("a COD handling fee", { max: MAX_FEE }),
    minDeliveryDays: optionalWholeNumberText().refine(isWithinDeliveryDayLimit, {
      message: `Use at most ${MAX_DELIVERY_DAYS} days.`,
    }),
    maxDeliveryDays: optionalWholeNumberText().refine(isWithinDeliveryDayLimit, {
      message: `Use at most ${MAX_DELIVERY_DAYS} days.`,
    }),
  })
  .refine(
    ({ minDeliveryDays, maxDeliveryDays }) => (minDeliveryDays === "") === (maxDeliveryDays === ""),
    { message: "Fill in both delivery days, or leave both empty.", path: ["maxDeliveryDays"] },
  )
  .refine(
    ({ minDeliveryDays, maxDeliveryDays }) =>
      minDeliveryDays === "" ||
      maxDeliveryDays === "" ||
      Number(minDeliveryDays) <= Number(maxDeliveryDays),
    { message: "The longest can't be shorter than the shortest.", path: ["maxDeliveryDays"] },
  );
export type ZoneFormValues = z.infer<typeof zoneFormSchema>;

export const EMPTY_ZONE_FORM: ZoneFormValues = {
  name: "",
  cities: [],
  standardDeliveryFee: "",
  freeDeliveryThreshold: "",
  codHandlingFee: "",
  minDeliveryDays: "",
  maxDeliveryDays: "",
};
