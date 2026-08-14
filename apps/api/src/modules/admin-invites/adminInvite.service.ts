import { env } from "#config/env.config.js";
import { adminInviteTemplate } from "#email-templates/templates.js";
import { sendEmail } from "#lib/email.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";

import { adminInviteRepository } from "./adminInvite.repository.js";
import type { AdminInviteSummary } from "./adminInvite.types.js";
import { toSummary } from "./adminInvite.utils.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CONFLICT_STATUS = 409;

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
