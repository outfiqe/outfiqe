import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  InviteRiderBody,
  ListRidersQuery,
  RiderIdParam,
  UpdateRiderStatusBody,
  UpdateRiderVehicleBody,
  VerifyRiderIdentityBody,
} from "./rider.schemas.js";
import { logisticsRiderService } from "./rider.service.js";

export const logisticsRiderController = {
  async list(_req: Request, res: Response) {
    const page = await logisticsRiderService.listRiders(validated.query<ListRidersQuery>(res));
    sendSuccess(res, page, "Riders.");
  },

  async listInvites(_req: Request, res: Response) {
    const invites = await logisticsRiderService.listPendingRiderInvites();
    sendSuccess(res, { invites }, "Pending rider invites.");
  },

  async invite(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    await logisticsRiderService.inviteRider(validated.body<InviteRiderBody>(res), userId);
    sendSuccess(res, null, "Rider invited.", HTTP_STATUS.CREATED);
  },

  async verifyIdentity(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { riderId } = validated.params<RiderIdParam>(res);
    const rider = await logisticsRiderService.verifyRiderIdentity(
      riderId,
      validated.body<VerifyRiderIdentityBody>(res),
      userId,
    );
    sendSuccess(res, rider, "Rider's ID recorded as checked.");
  },

  async setStatus(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { riderId } = validated.params<RiderIdParam>(res);
    const rider = await logisticsRiderService.setRiderStatus(
      riderId,
      validated.body<UpdateRiderStatusBody>(res),
      userId,
    );
    sendSuccess(res, rider, "Rider status updated.");
  },

  async updateVehicle(_req: Request, res: Response) {
    const { riderId } = validated.params<RiderIdParam>(res);
    const rider = await logisticsRiderService.updateRiderVehicle(
      riderId,
      validated.body<UpdateRiderVehicleBody>(res),
    );
    sendSuccess(res, rider, "Rider vehicle updated.");
  },
};
