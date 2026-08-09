import { brandApplicationRepository } from "./brandApplication.repository.js";

import { env } from "#config/env.config.js";
import { sendEmail } from "#lib/email.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import logger from "#lib/winston.utils.js";

import { AppError } from "../../shared/middlewares/error-handler.js";
import { BrandApplicationStatus } from "../../generated/prisma/enums.js";
import {
  brandApplicationReceivedInternalTemplate,
  brandApprovedTemplate,
  brandRejectedTemplate,
} from "../../shared/email-templates/templates.js";

import type {
  BrandApplicationRecord,
  CreateBrandApplicationInput,
} from "./brandApplication.types.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;

const requirePendingApplication = async (
  applicationId: string,
): Promise<BrandApplicationRecord> => {
  const application = await brandApplicationRepository.findById(applicationId);
  if (!application) {
    throw new AppError("NOT_FOUND", "Brand application not found.", NOT_FOUND_STATUS);
  }

  if (application.status !== BrandApplicationStatus.PENDING) {
    throw new AppError(
      "ALREADY_REVIEWED",
      "This application has already been reviewed.",
      CONFLICT_STATUS,
    );
  }

  return application;
};

export const brandApplicationService = {
  async submit(input: CreateBrandApplicationInput): Promise<BrandApplicationRecord> {
    const application = await brandApplicationRepository.create(input);

    const { subject, html } = brandApplicationReceivedInternalTemplate({
      ...input,
      reviewUrl: `${env.ADMIN_URL}/brand-applications`,
    });

    await sendEmail({
      to: env.GMAIL_USER,
      subject,
      body: `${input.brandName} applied. Review it in the admin panel: ${env.ADMIN_URL}/brand-applications`,
      html,
    });

    logger.info(`Brand application received: ${application.id}`);
    return application;
  },

  async list(status?: BrandApplicationStatus): Promise<BrandApplicationRecord[]> {
    return brandApplicationRepository.list(status);
  },

  async approve(applicationId: string, adminUserId: string): Promise<void> {
    const application = await requirePendingApplication(applicationId);

    const inviteToken = generateOpaqueToken();
    await brandApplicationRepository.approve(application, {
      reviewedById: adminUserId,
      tokenHash: hashToken(inviteToken),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    });

    const inviteUrl = `${env.FRONTEND_URL}/register/brand?token=${inviteToken}`;
    const { subject, html } = brandApprovedTemplate(application.brandName, inviteUrl);

    await sendEmail({
      to: application.email,
      subject,
      body: `${application.brandName} is approved. Set up your account: ${inviteUrl}`,
      html,
    });

    logger.info(`Brand application approved: ${applicationId} by admin ${adminUserId}`);
  },

  async reject(applicationId: string, adminUserId: string, reason?: string): Promise<void> {
    const application = await requirePendingApplication(applicationId);

    await brandApplicationRepository.reject(applicationId, adminUserId);

    const { subject, html } = brandRejectedTemplate(application.brandName, reason);
    await sendEmail({
      to: application.email,
      subject,
      body: `An update on your Outfiqe application for ${application.brandName}.`,
      html,
    });

    logger.info(`Brand application rejected: ${applicationId} by admin ${adminUserId}`);
  },
};
