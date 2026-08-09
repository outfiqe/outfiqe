import { adminInviteRepository } from "./adminInvite.repository.js";
import { userRepository } from "../users/user.repository.js";

import { env } from "#config/env.config.js";
import { sendEmail } from "#lib/email.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import logger from "#lib/winston.utils.js";

import { AppError } from "../../shared/middlewares/error-handler.js";
import { adminInviteTemplate } from "../../shared/email-templates/templates.js";

import type { AdminInviteRecord, AdminInviteSummary } from "./adminInvite.types.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CONFLICT_STATUS = 409;

const toSummary = (invite: AdminInviteRecord): AdminInviteSummary => {
  const status = invite.acceptedAt
    ? "ACCEPTED"
    : invite.expiresAt.getTime() <= Date.now()
      ? "EXPIRED"
      : "PENDING";

  return {
    id: invite.id,
    email: invite.email,
    name: invite.name,
    status,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
  };
};

export const adminInviteService = {
  async invite(email: string, name: string, invitedById: string): Promise<void> {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(
        "USER_EXISTS",
        "An account with this email already exists.",
        CONFLICT_STATUS,
      );
    }

    const rawToken = generateOpaqueToken();
    await adminInviteRepository.create({
      email,
      name,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedById,
    });

    const inviteUrl = `${env.ADMIN_URL}/register?token=${rawToken}`;
    const { subject, html } = adminInviteTemplate(name, inviteUrl);

    await sendEmail({
      to: email,
      subject,
      body: `You've been invited to administer Outfiqe: ${inviteUrl}`,
      html,
    });

    logger.info(`Admin invite sent to ${email} by ${invitedById}`);
  },

  async list(): Promise<AdminInviteSummary[]> {
    const invites = await adminInviteRepository.list();
    return invites.map(toSummary);
  },
};
