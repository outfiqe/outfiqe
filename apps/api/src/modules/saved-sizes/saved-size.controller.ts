import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { ProductTypeIdParams, SaveSizeBody } from "./saved-size.schemas.js";
import { savedSizeService } from "./saved-size.service.js";

export const savedSizeController = {
  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    sendSuccess(res, await savedSizeService.listForUser(userId), "Your sizes.");
  },

  async saveMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { productTypeId } = validated.params<ProductTypeIdParams>(res);
    const { sizeLabel } = validated.body<SaveSizeBody>(res);
    await savedSizeService.save(userId, productTypeId, sizeLabel);
    sendSuccess(res, await savedSizeService.listForUser(userId), "Size saved.");
  },

  async removeMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { productTypeId } = validated.params<ProductTypeIdParams>(res);
    await savedSizeService.remove(userId, productTypeId);
    sendSuccess(res, await savedSizeService.listForUser(userId), "Size removed.");
  },
};
