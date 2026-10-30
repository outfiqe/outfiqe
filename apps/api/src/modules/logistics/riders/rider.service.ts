import { addDays } from "date-fns/addDays";

import { env } from "#config/env.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { riderInviteTemplate } from "#email-templates/account.templates.js";
import { RiderEmploymentType, RiderStatus } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { authRepository } from "#modules/auth/auth.repository.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { userRepository } from "#modules/users/user.repository.js";

import { logisticsErrors } from "../logistics.errors.js";
import { logisticsRiderRepository } from "./rider.repository.js";
import type {
  InviteRiderBody,
  ListRidersQuery,
  UpdateRiderStatusBody,
  UpdateRiderVehicleBody,
  VerifyRiderIdentityBody,
} from "./rider.schemas.js";
import type { RiderInviteView, RiderView } from "./rider.types.js";
import { toRiderInviteView, toRiderView } from "./rider.utils.js";

const RIDER_INVITE_TTL_DAYS = 7;
const RIDER_AUDIT_TARGET_TYPE = "Rider";
const STATUSES_THAT_END_ACCESS: ReadonlySet<RiderStatus> = new Set([
  RiderStatus.SUSPENDED,
  RiderStatus.OFFBOARDED,
]);

const requireRider = async (riderId: string) => {
  const rider = await logisticsRiderRepository.findRiderById(riderId);
  if (!rider) throw logisticsErrors.riderNotFound();
  return rider;
};

const needsIdentityCheckBeforeActivation = (rider: {
  employmentType: RiderEmploymentType;
  identityVerifiedAt: Date | null;
}) => rider.employmentType === RiderEmploymentType.CONTRACTOR && rider.identityVerifiedAt === null;

export const logisticsRiderService = {
  async inviteRider(body: InviteRiderBody, invitedById: string): Promise<void> {
    const { email, name, hubId, employmentType } = body;
    if (await userRepository.findByEmail(email)) {
      throw new AppError(
        "USER_EXISTS",
        "An account with this email already exists.",
        HTTP_STATUS.CONFLICT,
      );
    }
    if (await logisticsRiderRepository.findPendingRiderInviteByEmail(email)) {
      throw new AppError(
        "INVITE_ALREADY_PENDING",
        "An invite is already pending for this email.",
        HTTP_STATUS.CONFLICT,
      );
    }
    if (!(await logisticsRiderRepository.findActiveHub(hubId))) {
      throw logisticsErrors.hubNotOpen();
    }

    const rawToken = generateOpaqueToken();
    await logisticsRiderRepository.createRiderInvite({
      email,
      name,
      hubId,
      employmentType,
      tokenHash: hashToken(rawToken),
      expiresAt: addDays(new Date(), RIDER_INVITE_TTL_DAYS),
      invitedById,
    });

    const inviteUrl = `${env.FRONTEND_URL}/register/rider?token=${rawToken}`;
    const { subject, html } = riderInviteTemplate(name, inviteUrl);
    await sendEmail({
      to: email,
      subject,
      body: `You've been invited to ride with Outfiqe: ${inviteUrl}`,
      html,
    });

    await platformAudit.record({
      actorUserId: invitedById,
      action: PLATFORM_AUDIT_ACTION.RIDER_INVITED,
      summary: `Invited ${email} as a ${employmentType.toLowerCase()} rider`,
      targetType: RIDER_AUDIT_TARGET_TYPE,
      metadata: { email, hubId, employmentType },
    });
  },

  async listPendingRiderInvites(): Promise<RiderInviteView[]> {
    const invites = await logisticsRiderRepository.listPendingRiderInvites();
    return invites.map(toRiderInviteView);
  },

  async listRiders(
    query: ListRidersQuery,
  ): Promise<{ items: RiderView[]; nextCursor: string | null }> {
    const riders = await logisticsRiderRepository.listRiders(query);
    const { items, nextCursor } = buildCursorPage(riders, query.limit, (rider) => rider.id);
    return { items: items.map(toRiderView), nextCursor };
  },

  async verifyRiderIdentity(
    riderId: string,
    { documentType, documentLast4 }: VerifyRiderIdentityBody,
    verifiedById: string,
  ): Promise<RiderView> {
    await requireRider(riderId);
    const rider = await logisticsRiderRepository.recordRiderIdentityCheck(riderId, {
      documentType,
      documentLast4: documentLast4.toUpperCase(),
      verifiedById,
    });

    await platformAudit.record({
      actorUserId: verifiedById,
      action: PLATFORM_AUDIT_ACTION.RIDER_IDENTITY_VERIFIED,
      summary: `Checked rider ${riderId}'s ${documentType.toLowerCase()} in person`,
      targetType: RIDER_AUDIT_TARGET_TYPE,
      targetId: riderId,
      metadata: { documentType },
    });
    return toRiderView(rider);
  },

  async setRiderStatus(
    riderId: string,
    { status }: UpdateRiderStatusBody,
    changedById: string,
  ): Promise<RiderView> {
    const currentRider = await requireRider(riderId);
    const isActivatingUnverifiedContractor =
      status === RiderStatus.ACTIVE && needsIdentityCheckBeforeActivation(currentRider);
    if (isActivatingUnverifiedContractor) {
      throw new AppError(
        "RIDER_IDENTITY_NOT_CHECKED",
        "Check this contractor's ID in person before activating them.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const isEndingAccess = STATUSES_THAT_END_ACCESS.has(status);
    const rider = await prisma.$transaction(async (tx) => {
      const updatedRider = await logisticsRiderRepository.setRiderStatus(tx, riderId, status);
      if (isEndingAccess) {
        await logisticsRiderRepository.releaseOpenTasksForRider(tx, riderId);
        await authRepository.deleteAllRefreshTokensForUser(updatedRider.userId, tx);
      }
      return updatedRider;
    });

    await platformAudit.record({
      actorUserId: changedById,
      action: PLATFORM_AUDIT_ACTION.RIDER_STATUS_CHANGED,
      summary: `Rider ${riderId} is now ${status.toLowerCase()}`,
      targetType: RIDER_AUDIT_TARGET_TYPE,
      targetId: riderId,
      metadata: { fromStatus: currentRider.status, toStatus: status },
    });
    return toRiderView(rider);
  },

  async updateRiderVehicle(riderId: string, vehicle: UpdateRiderVehicleBody): Promise<RiderView> {
    await requireRider(riderId);
    return toRiderView(await logisticsRiderRepository.updateRiderVehicle(riderId, vehicle));
  },
};
