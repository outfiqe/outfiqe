import { z } from "zod";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const updateOrderFeeSettingsSchema = z
  .object({
    standardDeliveryFee: z.number().int().nonnegative().optional(),
    freeDeliveryThreshold: z.number().int().nonnegative().optional(),
    codHandlingFee: z.number().int().nonnegative().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one fee must be provided.",
  });

export type UpdateOrderFeeSettingsBody = z.infer<typeof updateOrderFeeSettingsSchema>;

export const listOrderFeeSettingsHistoryQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type ListOrderFeeSettingsHistoryQuery = z.infer<
  typeof listOrderFeeSettingsHistoryQuerySchema
>;
