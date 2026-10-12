import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type { BankQrPreviewBody } from "./bank-qr-verification.schemas.js";
import { bankQrVerificationService } from "./bank-qr-verification.service.js";

export const bankQrVerificationController = {
  async preview(_req: Request, res: Response) {
    const { qrCodeImageUrl } = validated.body<BankQrPreviewBody>(res);
    const preview = await bankQrVerificationService.previewQr(qrCodeImageUrl);
    sendSuccess(res, preview, "Bank QR read.");
  },
};
