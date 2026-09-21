import { z } from "zod";

import { percentText } from "@/lib/formFields";

const MAX_RATE_PERCENT = 100;

export const gatewayRateFormSchema = z.object({
  ratePercent: percentText("a rate", { max: MAX_RATE_PERCENT }),
});
export type GatewayRateFormValues = z.infer<typeof gatewayRateFormSchema>;
