import { CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { outfitOfferRepository } from "#modules/outfit-offers/outfit-offer.repository.js";
import { userRepository } from "#modules/users/user.repository.js";

const FORBIDDEN_STATUS = 403;
const DEFAULT_MESSAGE = "Only approved muses can do this.";

type GuardedUser = Awaited<ReturnType<typeof userRepository.findById>>;

const isApprovedCreator = (user: NonNullable<GuardedUser>): boolean =>
  user.isCreator && user.creatorStatus === CreatorStatus.APPROVED;

const rejectStaffAndBrandAccounts = (user: GuardedUser): void => {
  if (user && user.role !== UserRole.CUSTOMER) {
    throw new AppError(
      "STAFF_CANNOT_BE_CREATOR",
      "Staff and brand accounts can't drop as a muse.",
      FORBIDDEN_STATUS,
    );
  }
};

export const requireApprovedCreator = async (
  userId: string,
  message = DEFAULT_MESSAGE,
): Promise<void> => {
  const user = await userRepository.findById(userId);
  rejectStaffAndBrandAccounts(user);
  if (!user || !isApprovedCreator(user)) {
    throw new AppError("NOT_A_CREATOR", message, FORBIDDEN_STATUS);
  }
};

const canUserEarnCommission = async (user: GuardedUser): Promise<boolean> => {
  if (!user || user.role !== UserRole.CUSTOMER) return false;
  if (isApprovedCreator(user)) return true;
  const [hasCommission, hasOfferPayout] = await Promise.all([
    commissionRepository.hasAnyForPerson(user.id),
    outfitOfferRepository.hasPayoutForCreator(user.id),
  ]);
  return hasCommission || hasOfferPayout;
};

export const isCommissionEarner = async (userId: string): Promise<boolean> =>
  canUserEarnCommission(await userRepository.findById(userId));

export const requireCommissionEarner = async (userId: string, message: string): Promise<void> => {
  const user = await userRepository.findById(userId);
  rejectStaffAndBrandAccounts(user);
  if (!(await canUserEarnCommission(user))) {
    throw new AppError("NOT_A_CREATOR", message, FORBIDDEN_STATUS);
  }
};
