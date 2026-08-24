import { z } from "zod";

export const financialRollupQuerySchema = z.object({
  range: z.enum(["cycle", "30d", "all"]).default("cycle"),
});
export type FinancialRollupQuery = z.infer<typeof financialRollupQuerySchema>;
