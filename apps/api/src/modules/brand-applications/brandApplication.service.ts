import { env } from "#config/env.config.js";
import {
  brandApplicationReceivedInternalTemplate,
  brandApprovedTemplate,
  brandRejectedTemplate,
} from "#email-templates/templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { BrandApplicationStatus } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { brandApplicationRepository } from "./brandApplication.repository.js";
import type { ListBrandApplicationsQuery } from "./brandApplication.schemas.js";
import type {
  BrandApplicationPage,
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

    await eventBus.publish(DomainEvents.BRAND_APPLICATION_SUBMITTED, {
      applicationId: application.id,
      brandName: application.brandName,
    });

    logger.info(`Brand application received: ${application.id}`);
    return application;
  },

  async list(query: ListBrandApplicationsQuery): Promise<BrandApplicationPage> {
    const rows = await brandApplicationRepository.list(query.status, {
      cursor: query.cursor,
      limit: query.limit,
    });

    const { items: applications, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);
    return { applications, nextCursor };
  },

  async approve(applicationId: string, adminUserId: string): Promise<void> {
    const application = await requirePendingApplication(applicationId);

    const inviteToken = generateOpaqueToken();
    await brandApplicationRepository.approve(application, {
      reviewedById: adminUserId,
      tokenHash: hashToken(inviteToken),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    });

    const { brandName, email } = application;

    const inviteUrl = `${env.FRONTEND_URL}/register/brand?token=${inviteToken}`;
    const { subject, html } = brandApprovedTemplate(brandName, inviteUrl);

    await sendEmail({
      to: email,
      subject,
      body: `${brandName} is approved. Set up your account: ${inviteUrl}`,
      html,
    });

    logger.info(`Brand application approved: ${applicationId} by admin ${adminUserId}`);
  },

  async reject(applicationId: string, adminUserId: string, reason?: string): Promise<void> {
    const application = await requirePendingApplication(applicationId);

    await brandApplicationRepository.reject(applicationId, adminUserId);

    const { brandName, email } = application;

    const { subject, html } = brandRejectedTemplate(brandName, reason);
    await sendEmail({
      to: email,
      subject,
      body: `An update on your Outfiqe application for ${brandName}.`,
      html,
    });

    logger.info(`Brand application rejected: ${applicationId} by admin ${adminUserId}`);
  },
};
