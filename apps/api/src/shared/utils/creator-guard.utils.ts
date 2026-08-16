import { CreatorStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";

const FORBIDDEN_STATUS = 403;
const DEFAULT_MESSAGE = "Only approved creators can do this.";

export const requireApprovedCreator = async (
  userId: string,
  message = DEFAULT_MESSAGE,
): Promise<void> => {
  const user = await userRepository.findById(userId);
  if (!user || !user.isCreator || user.creatorStatus !== CreatorStatus.APPROVED) {
    throw new AppError("NOT_A_CREATOR", message, FORBIDDEN_STATUS);
  }
};
