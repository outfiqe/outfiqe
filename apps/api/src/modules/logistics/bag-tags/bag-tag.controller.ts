import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  BagTagBatchIdParam,
  CreateBagTagBatchBody,
  ListBagTagBatchesQuery,
} from "./bag-tag.schemas.js";
import { logisticsBagTagService } from "./bag-tag.service.js";

export const logisticsBagTagController = {
  async list(_req: Request, res: Response) {
    const page = await logisticsBagTagService.listBagTagBatches(
      validated.query<ListBagTagBatchesQuery>(res),
    );
    sendSuccess(res, page, "Sticker batches.");
  },

  async create(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const batch = await logisticsBagTagService.createBagTagBatch(
      validated.body<CreateBagTagBatchBody>(res),
      userId,
    );
    sendSuccess(res, batch, "Sticker batch created.", HTTP_STATUS.CREATED);
  },

  async getSheet(_req: Request, res: Response) {
    const { batchId } = validated.params<BagTagBatchIdParam>(res);
    const batch = await logisticsBagTagService.getBagTagBatchSheet(batchId);
    sendSuccess(res, batch, "Sticker batch.");
  },
};
