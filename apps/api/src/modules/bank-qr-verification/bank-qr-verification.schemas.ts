import { z } from "zod";

export const bankQrPreviewBodySchema = z.object({
  qrCodeImageUrl: z.url("Upload a photo of your bank QR."),
});

export type BankQrPreviewBody = z.infer<typeof bankQrPreviewBodySchema>;
