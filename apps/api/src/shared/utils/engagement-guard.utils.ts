import { isStaffUserRole } from "@outfiqe/utils";

import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";

const FORBIDDEN_STATUS = 403;
const DEFAULT_CODE = "ADMIN_CANNOT_ENGAGE";
const DEFAULT_MESSAGE =
  "Staff accounts can't like, comment, or post — this keeps trending and payouts based on real audience activity.";

export const assertCanEngage = async (
  userId: string,
  overrides?: { code?: string; message?: string },
): Promise<void> => {
  const user = await userRepository.findById(userId);
  if (isStaffUserRole(user?.role)) {
    throw new AppError(
      overrides?.code ?? DEFAULT_CODE,
      overrides?.message ?? DEFAULT_MESSAGE,
      FORBIDDEN_STATUS,
    );
  }
};
