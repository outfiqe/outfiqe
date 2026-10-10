import { z } from "zod";

import { wholeNumberText } from "@/lib/formFields";

const ZONE_NAME_MAX_LENGTH = 120;
const MAX_FEE = 1_000_000;

export const zoneFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name for the zone.")
    .max(ZONE_NAME_MAX_LENGTH, `Use at most ${ZONE_NAME_MAX_LENGTH} characters.`),
  cities: z.array(z.string()),
  standardDeliveryFee: wholeNumberText("a standard delivery fee", { max: MAX_FEE }),
  freeDeliveryThreshold: wholeNumberText("a free delivery threshold", { max: MAX_FEE }),
  codHandlingFee: wholeNumberText("a COD handling fee", { max: MAX_FEE }),
});
export type ZoneFormValues = z.infer<typeof zoneFormSchema>;

export const EMPTY_ZONE_FORM: ZoneFormValues = {
  name: "",
  cities: [],
  standardDeliveryFee: "",
  freeDeliveryThreshold: "",
  codHandlingFee: "",
};
