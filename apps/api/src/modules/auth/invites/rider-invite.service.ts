import { isPast } from "date-fns/isPast";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { RiderEmploymentType, RiderStatus, UserRole } from "#generated/prisma/enums.js";
import { runWithHandleCollisionRetry } from "#lib/handle.utils.js";
import { hashToken } from "#lib/opaque-token.utils.js";
import { hashPassword } from "#lib/password.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { logisticsRiderRepository } from "#modules/logistics/riders/rider.repository.js";
import { userRepository } from "#modules/users/user.repository.js";

import { resolvePlatformFields } from "../auth.platform-fields.js";
import { issueTokens } from "../auth.tokens.js";
import type { AuthSession, RegisterRiderInput, RiderInviteInfo } from "../auth.types.js";
import { toAuthUser } from "../auth.utils.js";

const STARTING_STATUS_BY_EMPLOYMENT_TYPE: Record<RiderEmploymentType, RiderStatus> = {
  [RiderEmploymentType.EMPLOYEE]: RiderStatus.ACTIVE,
  [RiderEmploymentType.CONTRACTOR]: RiderStatus.PENDING_VERIFICATION,
};

const inviteUsedError = () =>
  new AppError("INVITE_USED", "This invite link has already been used.", HTTP_STATUS.BAD_REQUEST);

const requireAcceptableRiderInvite = async (inviteToken: string) => {
  const invite = await logisticsRiderRepository.findRiderInviteByTokenHash(hashToken(inviteToken));
  if (!invite) {
    throw new AppError("INVALID_INVITE", "This invite link is not valid.", HTTP_STATUS.BAD_REQUEST);
  }
  if (isPast(invite.expiresAt)) {
    throw new AppError(
      "INVITE_EXPIRED",
      "This invite link has expired. Ask your hub lead for a new one.",
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  if (invite.acceptedAt) throw inviteUsedError();
  return invite;
};

const assertRiderContactIsFree = async (email: string, phone: string) => {
  if (await userRepository.findByEmail(email)) {
    throw new AppError(
      "USER_EXISTS",
      "An account with this email already exists.",
      HTTP_STATUS.CONFLICT,
    );
  }
  if (await userRepository.findByPhone(phone)) {
    throw new AppError(
      "PHONE_EXISTS",
      "An account with this phone number already exists.",
      HTTP_STATUS.CONFLICT,
    );
  }
};

export const authRiderInviteService = {
  async getRiderInvite(inviteToken: string): Promise<RiderInviteInfo> {
    const { email, name, hub } = await requireAcceptableRiderInvite(inviteToken);
    return { email, name, hubName: hub.name };
  },

  async registerRider({ inviteToken, phone, password }: RegisterRiderInput): Promise<AuthSession> {
    const invite = await requireAcceptableRiderInvite(inviteToken);
    const { id: inviteId, email, name, hubId, employmentType } = invite;
    await assertRiderContactIsFree(email, phone);

    const passwordHash = await hashPassword(password);
    const user = await runWithHandleCollisionRetry(() =>
      prisma.$transaction(async (tx) => {
        const wasClaimed = await logisticsRiderRepository.markRiderInviteAccepted(tx, inviteId);
        if (!wasClaimed) throw inviteUsedError();

        const createdUser = await userRepository.create(
          { name, email, phone, password, passwordHash, role: UserRole.RIDER, emailVerified: true },
          tx,
        );
        await logisticsRiderRepository.createRiderProfile(tx, {
          userId: createdUser.id,
          hubId,
          employmentType,
          status: STARTING_STATUS_BY_EMPLOYMENT_TYPE[employmentType],
        });
        return createdUser;
      }),
    );

    const tokens = await issueTokens(user);
    logger.info(`Rider registered: ${user.id} at hub ${hubId}`);

    return {
      ...tokens,
      user: {
        ...toAuthUser(user),
        ...(await resolvePlatformFields(user.id, user.role)),
        hasCrmAccess: await crmAccessService.resolveHasCrmAccess(user.id),
      },
    };
  },
};
