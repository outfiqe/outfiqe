import { z } from "zod";

const STORAGE_KEY = "outfiqe:buyNow";

export const buyNowPayloadSchema = z.object({
  productId: z.string(),
  sizeId: z.string(),
  qty: z.number().int().min(1),
  productName: z.string(),
  brandName: z.string(),
  imageUrl: z.string().nullable(),
  sizeLabel: z.string(),
  unitPrice: z.number(),
});
export type BuyNowPayload = z.infer<typeof buyNowPayloadSchema>;

export const saveBuyNowPayload = (payload: BuyNowPayload): void => {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const readBuyNowPayload = (): BuyNowPayload | null => {
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = buyNowPayloadSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const clearBuyNowPayload = (): void => {
  window.sessionStorage.removeItem(STORAGE_KEY);
};
