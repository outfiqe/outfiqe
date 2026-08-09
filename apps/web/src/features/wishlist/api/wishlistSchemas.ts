import { z } from "zod";

export const wishlistResultSchema = z.object({
  saved: z.boolean(),
});
export type WishlistResult = z.infer<typeof wishlistResultSchema>;
