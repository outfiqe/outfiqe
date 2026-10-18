import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CodRemittanceParam,
  ListCodRemittancesQuery,
  ListUnremittedParcelsQuery,
  RecordCodRemittanceBody,
} from "./cod.schemas.js";
import { logisticsCodService } from "./cod.service.js";

export const logisticsCodController = {
  async summarizeUnremittedCash(_req: Request, res: Response) {
    const partners = await logisticsCodService.summarizeUnremittedCash();
    sendSuccess(res, { partners }, "Cash still with delivery partners.");
  },

  async listUnremittedParcels(_req: Request, res: Response) {
    const unremittedParcels = await logisticsCodService.listUnremittedParcels(
      validated.query<ListUnremittedParcelsQuery>(res),
    );
    sendSuccess(res, unremittedParcels, "Delivered cash parcels not paid in yet.");
  },

  async recordRemittance(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const remittance = await logisticsCodService.recordRemittance(
      userId,
      validated.body<RecordCodRemittanceBody>(res),
    );
    sendSuccess(res, remittance, "Payment recorded.", HTTP_STATUS.CREATED);
  },

  async listRemittances(_req: Request, res: Response) {
    const remittances = await logisticsCodService.listRemittances(
      validated.query<ListCodRemittancesQuery>(res),
    );
    sendSuccess(res, remittances, "Partner payments.");
  },

  async getRemittance(_req: Request, res: Response) {
    const { remittanceId } = validated.params<CodRemittanceParam>(res);
    const remittance = await logisticsCodService.getRemittance(remittanceId);
    sendSuccess(res, remittance, "Partner payment.");
  },
};
