import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { Prisma } from "#generated/prisma/client.js";
import { BrandRole, UserRole } from "#generated/prisma/enums.js";
import { runWithHandleCollisionRetry } from "#lib/handle.utils.js";
import { hashToken } from "#lib/opaque-token.utils.js";
import { hashPassword } from "#lib/password.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { adminInviteRepository } from "#modules/admin-invites/admin-invite.repository.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { userRepository } from "#modules/users/user.repository.js";

import { resolvePlatformFields } from "../auth.platform-fields.js";
import { authRepository } from "../auth.repository.js";
import { issueTokens } from "../auth.tokens.js";
import type {
  AdminInviteInfo,
  AuthSession,
  BrandAuthSession,
  BrandInviteInfo,
  CrmInviteAuthSession,
  CrmInviteInfo,
  RegisterAdminInput,
  RegisterBrandInput,
  RegisterCrmInviteInput,
} from "../auth.types.js";
import { toAuthUser } from "../auth.utils.js";

const runRegistrationTransaction = <Result>(
  createAccount: (transaction: Prisma.TransactionClient) => Promise<Result>,
): Promise<Result> => runWithHandleCollisionRetry(() => prisma.$transaction(createAccount));

export const authInviteService = {
  async getBrandInvite(inviteToken: string): Promise<BrandInviteInfo> {
    const invite = await authRepository.findBrandInviteByTokenHash(hashToken(inviteToken));
    if (!invite) {
      throw new AppError(
        "INVALID_INVITE",
        "This invite link is not valid.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        "INVITE_EXPIRED",
        "This invite link has expired. Please contact us for a new one.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (invite.acceptedAt) {
      throw new AppError(
        "INVITE_USED",
        "This invite link has already been used.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    return { email: invite.email, brandName: invite.brand.name };
  },

  async registerBrand(input: RegisterBrandInput): Promise<BrandAuthSession> {
    const { inviteToken, name, phone, password } = input;

    const invite = await authRepository.findBrandInviteByTokenHash(hashToken(inviteToken));
    if (!invite) {
      throw new AppError(
        "INVALID_INVITE",
        "This invite link is not valid or has already been used.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const { expiresAt, acceptedAt, email: inviteEmail, brandId, id: inviteId, brand } = invite;

    if (expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        "INVITE_EXPIRED",
        "This invite link has expired. Please contact us for a new one.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (acceptedAt) {
      throw new AppError(
        "INVITE_USED",
        "This invite link has already been used.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const existingByEmail = await userRepository.findByEmail(inviteEmail);
    if (existingByEmail) {
      throw new AppError(
        "USER_EXISTS",
        "An account with this email already exists.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const existingByPhone = await userRepository.findByPhone(phone);
    if (existingByPhone) {
      throw new AppError(
        "PHONE_EXISTS",
        "An account with this phone number already exists.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await runRegistrationTransaction(async (tx) => {
      const createdUser = await userRepository.create(
        {
          name,
          email: inviteEmail,
          phone,
          password,
          passwordHash,
          role: UserRole.BRAND_OWNER,
          emailVerified: true,
        },
        tx,
      );

      await authRepository.createBrandMembership(
        {
          userId: createdUser.id,
          brandId,
          role: BrandRole.OWNER,
        },
        tx,
      );
      await authRepository.markBrandInviteAccepted(inviteId, tx);

      return createdUser;
    });

    await eventBus.publish(DomainEvents.BRAND_OWNER_REGISTERED, {
      userId: user.id,
      brandId,
      email: user.email,
    });

    const tokens = await issueTokens(user);

    logger.info(`Brand owner registered: ${user.id} for brand ${brandId}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: brand.avatarUrl,
        role: user.role,
        brandId,
        ...(await resolvePlatformFields(user.id, user.role)),
        hasCrmAccess: await crmAccessService.resolveHasCrmAccess(user.id),
      },
    };
  },

  async getAdminInvite(inviteToken: string): Promise<AdminInviteInfo> {
    const invite = await adminInviteRepository.findByTokenHash(hashToken(inviteToken));
    if (!invite) {
      throw new AppError(
        "INVALID_INVITE",
        "This invite link is not valid.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        "INVITE_EXPIRED",
        "This invite link has expired. Please contact us for a new one.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (invite.acceptedAt) {
      throw new AppError(
        "INVITE_USED",
        "This invite link has already been used.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    return { email: invite.email, name: invite.name };
  },

  async registerAdmin(input: RegisterAdminInput): Promise<AuthSession> {
    const { inviteToken, phone, password } = input;

    const invite = await adminInviteRepository.findByTokenHash(hashToken(inviteToken));
    if (!invite) {
      throw new AppError(
        "INVALID_INVITE",
        "This invite link is not valid or has already been used.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const { expiresAt, acceptedAt, email: inviteEmail, name: inviteName, id: inviteId } = invite;

    if (expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        "INVITE_EXPIRED",
        "This invite link has expired. Please contact us for a new one.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (acceptedAt) {
      throw new AppError(
        "INVITE_USED",
        "This invite link has already been used.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const existingByEmail = await userRepository.findByEmail(inviteEmail);
    if (existingByEmail) {
      throw new AppError(
        "USER_EXISTS",
        "An account with this email already exists.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const existingByPhone = await userRepository.findByPhone(phone);
    if (existingByPhone) {
      throw new AppError(
        "PHONE_EXISTS",
        "An account with this phone number already exists.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await runRegistrationTransaction(async (tx) => {
      const createdUser = await userRepository.create(
        {
          name: inviteName,
          email: inviteEmail,
          phone,
          password,
          passwordHash,
          role: UserRole.ADMIN,
          emailVerified: true,
        },
        tx,
      );

      await adminInviteRepository.markAccepted(inviteId, tx);

      const platformMembership = await crmAccessService.grantPlatformStaffMembership(
        createdUser.id,
        invite.roleId,
        tx,
      );
      if (!platformMembership) {
        logger.warn(
          `Registered admin ${createdUser.id} without a platform staff membership — platform organization is missing`,
        );
      }

      return createdUser;
    });

    await eventBus.publish(DomainEvents.ADMIN_REGISTERED, { userId: user.id, email: user.email });

    const tokens = await issueTokens(user);

    logger.info(`Admin registered: ${user.id}`);

    return {
      ...tokens,
      user: {
        ...toAuthUser(user),
        ...(await resolvePlatformFields(user.id, user.role)),
        hasCrmAccess: await crmAccessService.resolveHasCrmAccess(user.id),
      },
    };
  },

  async getCrmInvite(inviteToken: string): Promise<CrmInviteInfo> {
    return crmAccessService.getInviteRegistrationInfo(inviteToken);
  },

  async registerFromCrmInvite(input: RegisterCrmInviteInput): Promise<CrmInviteAuthSession> {
    const { inviteToken, name, phone, password } = input;

    const invite = await crmAccessService.findAcceptableInvite(inviteToken);

    const existingByEmail = await userRepository.findByEmail(invite.email);
    if (existingByEmail) {
      throw new AppError(
        "USER_EXISTS",
        "An account with this email already exists. Sign in and open the invite link to accept it.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const existingByPhone = await userRepository.findByPhone(phone);
    if (existingByPhone) {
      throw new AppError(
        "PHONE_EXISTS",
        "An account with this phone number already exists.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const passwordHash = await hashPassword(password);
    const { user, membership } = await runRegistrationTransaction(async (tx) => {
      const createdUser = await userRepository.create(
        {
          name,
          email: invite.email,
          phone,
          password,
          passwordHash,
          role: UserRole.TENANT_STAFF,
          emailVerified: true,
        },
        tx,
      );

      const createdMembership = await crmAccessService.attachMembershipForInvite(
        invite,
        createdUser.id,
        tx,
      );

      return { user: createdUser, membership: createdMembership };
    });

    await eventBus.publish(DomainEvents.ADMIN_REGISTERED, { userId: user.id, email: user.email });
    await crmAccessService.announceMemberJoined(membership);

    const tokens = await issueTokens(user);

    logger.info(
      `CRM invitee registered: ${user.id} into organization ${membership.organizationId}`,
    );

    return {
      ...tokens,
      user: {
        ...toAuthUser(user),
        ...(await resolvePlatformFields(user.id, user.role)),
        hasCrmAccess: await crmAccessService.resolveHasCrmAccess(user.id),
      },
      crmMembership: { id: membership.id, organizationId: membership.organizationId },
    };
  },
};
