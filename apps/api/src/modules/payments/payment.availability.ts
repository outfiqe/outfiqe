import { HTTP_STATUS } from "#constants/http.constants.js";
import { type CrmBillingProvider, PaymentMethod } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { KHALTI_PAYMENTS_FLAG } from "#modules/feature-flags/feature-flags.registry.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";

export const assertGatewayAvailable = async (
  gateway: PaymentMethod | CrmBillingProvider,
  userId: string,
): Promise<void> => {
  if (gateway !== PaymentMethod.KHALTI) return;

  const isKhaltiOn = await featureFlagsService.isEnabledForUser(KHALTI_PAYMENTS_FLAG, userId);
  if (isKhaltiOn) return;

  throw new AppError(
    "KHALTI_UNAVAILABLE",
    "Khalti isn't available right now. Please choose another way to pay.",
    HTTP_STATUS.UNPROCESSABLE_ENTITY,
  );
};
