import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreateRiderPayRateBody,
  ListMyRiderEarningsQuery,
  ListRiderEarningsQuery,
  RiderEarningParam,
  RiderPayRateParam,
  RiderPayRatesQuery,
  VoidRiderEarningBody,
} from "./rider-pay.schemas.js";
import { logisticsRiderPayService } from "./rider-pay.service.js";

export const logisticsRiderPayController = {
  async getRates(_req: Request, res: Response) {
    const { countryCode } = validated.query<RiderPayRatesQuery>(res);
    const payRates = await logisticsRiderPayService.getRiderPayRates(countryCode);
    sendSuccess(res, payRates, "Rider pay rates.");
  },

  async createRate(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const payRate = await logisticsRiderPayService.createRiderPayRate(
      userId,
      validated.body<CreateRiderPayRateBody>(res),
    );
    sendSuccess(res, payRate, "Pay rate saved.", HTTP_STATUS.CREATED);
  },

  async deactivateRate(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { rateId } = validated.params<RiderPayRateParam>(res);
    const payRate = await logisticsRiderPayService.deactivateRiderPayRate(userId, rateId);
    sendSuccess(res, payRate, "Pay rate switched off.");
  },

  async listEarnings(_req: Request, res: Response) {
    const earnings = await logisticsRiderPayService.listRiderEarnings(
      validated.query<ListRiderEarningsQuery>(res),
    );
    sendSuccess(res, earnings, "Rider earnings.");
  },

  async voidEarning(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { earningId } = validated.params<RiderEarningParam>(res);
    const { reason } = validated.body<VoidRiderEarningBody>(res);
    const earning = await logisticsRiderPayService.voidRiderEarning(userId, earningId, reason);
    sendSuccess(res, earning, "Earning voided.");
  },

  async listMyEarnings(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const earnings = await logisticsRiderPayService.listMyRiderEarnings(
      userId,
      validated.query<ListMyRiderEarningsQuery>(res),
    );
    sendSuccess(res, earnings, "Your earnings.");
  },
};
