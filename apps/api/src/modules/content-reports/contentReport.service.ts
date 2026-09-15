import type { UserRole } from "#generated/prisma/enums.js";
import { ContentReportStatus, ContentReportTarget } from "#generated/prisma/enums.js";
import { assertCanEngage } from "#lib/engagement-guard.utils.js";
import { hashToken } from "#lib/opaque-token.utils.js";
import { isLikelyBotUserAgent } from "#lib/user-agent.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { creatorLookRepository } from "#modules/creator-looks/creatorLook.repository.js";
import { creatorLookService } from "#modules/creator-looks/creatorLook.service.js";
import { CONTENT_MODERATE_PERMISSION_KEY } from "#modules/platform-access/platform-access.constants.js";
import { platformAccessService } from "#modules/platform-access/platform-access.service.js";

import { contentReportRepository } from "./contentReport.repository.js";
import {
  CONTENT_REPORT_RESOLUTION_ACTION,
  type ListContentReportsQuery,
  type ResolveContentReportBody,
  type SubmitContentReportBody,
} from "./contentReport.schemas.js";
import type { ContentReportPage } from "./contentReport.types.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const FORBIDDEN_STATUS = 403;

type SubmitReportContext = {
  reporterUserId: string | undefined;
  reporterIp: string | undefined;
  userAgent: string | undefined;
};

const removeReportedContent = async (
  targetType: ContentReportTarget,
  targetId: string,
  principal: { userId: string; role: UserRole },
): Promise<void> => {
  if (targetType === ContentReportTarget.CREATOR_LOOK) {
    await creatorLookService.remove(targetId, principal);
    return;
  }

  const comment = await creatorLookRepository.findCommentById(targetId);
  if (!comment) return;
  await creatorLookService.removeComment(comment.creatorLookId, targetId, principal);
};

export const contentReportService = {
  async submitReport(
    { targetType, targetId, reason, note }: SubmitContentReportBody,
    { reporterUserId, reporterIp, userAgent }: SubmitReportContext,
  ): Promise<void> {
    if (isLikelyBotUserAgent(userAgent)) return;

    if (reporterUserId) {
      await assertCanEngage(reporterUserId, {
        code: "ADMIN_CANNOT_REPORT",
        message:
          "Platform staff accounts can't file public reports — use the moderation tools directly instead.",
      });
    }

    const target = await contentReportRepository.findReportableTarget(targetType, targetId);
    if (!target) {
      throw new AppError("CONTENT_NOT_FOUND", "This content no longer exists.", NOT_FOUND_STATUS);
    }

    await contentReportRepository.create({
      targetType,
      targetId,
      reason,
      note: note ?? null,
      reportedById: reporterUserId ?? null,
      reporterIpHash: reporterIp ? hashToken(reporterIp) : null,
    });
  },

  listReports(query: ListContentReportsQuery): Promise<ContentReportPage> {
    return contentReportRepository.listForAdmin(query);
  },

  async countOpen(): Promise<{ openCount: number }> {
    return { openCount: await contentReportRepository.countOpen() };
  },

  async resolveReport(
    reportId: string,
    principal: { userId: string; role: UserRole },
    { action, note }: ResolveContentReportBody,
  ): Promise<{ contentRemoved: boolean }> {
    const report = await contentReportRepository.findResolvableReport(reportId);
    if (!report) {
      throw new AppError(
        "CONTENT_REPORT_NOT_FOUND",
        "This report no longer exists.",
        NOT_FOUND_STATUS,
      );
    }
    if (report.status !== ContentReportStatus.OPEN) {
      throw new AppError(
        "CONTENT_REPORT_ALREADY_RESOLVED",
        "This report has already been resolved.",
        CONFLICT_STATUS,
      );
    }

    const { targetType, targetId } = report;

    let contentRemoved = false;
    if (action === CONTENT_REPORT_RESOLUTION_ACTION.REMOVE_CONTENT) {
      const canModerate = await platformAccessService.principalHasPermission(
        principal,
        CONTENT_MODERATE_PERMISSION_KEY,
      );
      if (!canModerate) {
        throw new AppError(
          "FORBIDDEN",
          "You don't have permission to remove content.",
          FORBIDDEN_STATUS,
        );
      }

      const target = await contentReportRepository.findReportableTarget(targetType, targetId);
      if (target) {
        await removeReportedContent(targetType, targetId, principal);
        await contentReportRepository.incrementUserFlagCount(target.authorId);
        contentRemoved = true;
      }
    }

    await contentReportRepository.markResolved(reportId, {
      status:
        action === CONTENT_REPORT_RESOLUTION_ACTION.REMOVE_CONTENT
          ? ContentReportStatus.ACTIONED
          : ContentReportStatus.DISMISSED,
      resolutionNote: note ?? null,
      resolvedById: principal.userId,
    });

    return { contentRemoved };
  },
};
