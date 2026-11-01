import { HTTP_STATUS } from "#constants/http.constants.js";
import { RiderStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";

import { logisticsErrors } from "./logistics.errors.js";
import { logisticsRiderRepository } from "./riders/rider.repository.js";

export const requireActiveRider = async (userId: string) => {
  const rider = await logisticsRiderRepository.findRiderByUserId(userId);
  if (!rider) {
    throw logisticsErrors.noRiderProfile();
  }
  if (rider.status !== RiderStatus.ACTIVE) {
    throw new AppError(
      "RIDER_NOT_ACTIVE",
      "Your rider account isn't active yet. Ask your hub lead.",
      HTTP_STATUS.FORBIDDEN,
    );
  }
  return rider;
};
