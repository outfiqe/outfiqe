import {
  TagRejectionReason,
  TagReportReason,
  TagReportSource,
  TagReportStatus,
  TagReviewStatus,
} from "#generated/prisma/enums.js";
import { hashToken } from "#lib/opaque-token.utils.js";
import { isLikelyBotUserAgent } from "#lib/user-agent.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { tagReviewService } from "#modules/tag-reviews/tagReview.service.js";

import { tagReportRepository } from "./tagReport.repository.js";
import type {
  ListTagReportsQuery,
  ResolveTagReportBody,
  SubmitTagReportBody,
} from "./tagReport.schemas.js";
import type { TagReportPage } from "./tagReport.types.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

type SubmitReportContext = {
  reporterUserId: string | undefined;
  reporterIp: string | undefined;
  userAgent: string | undefined;
};

export const tagReportService = {
  async submitReport(
    { lookId, productId, reason, note }: SubmitTagReportBody,
    { reporterUserId, reporterIp, userAgent }: SubmitReportContext,
  ): Promise<void> {
    if (isLikelyBotUserAgent(userAgent)) return;

    const tag = await tagReportRepository.findReportableTag(lookId, productId);
    if (!tag || tag.reviewStatus !== TagReviewStatus.APPROVED) {
      throw new AppError(
        "TAG_NOT_FOUND",
        "That product isn't tagged in this look.",
        NOT_FOUND_STATUS,
      );
    }

    await tagReportRepository.create({
      creatorLookProductId: tag.id,
      source: TagReportSource.PUBLIC_REPORT,
      reason,
      note: note ?? null,
      reportedById: reporterUserId ?? null,
      reporterIpHash: reporterIp ? hashToken(reporterIp) : null,
    });
  },

  async recordCounterfeitEscalation(
    creatorLookProductId: string,
    creatorId: string,
    note: string | null,
  ): Promise<void> {
    await tagReportRepository.create({
      creatorLookProductId,
      source: TagReportSource.BRAND_COUNTERFEIT_REJECTION,
      reason: TagReportReason.COUNTERFEIT,
      note,
      reportedById: null,
      reporterIpHash: null,
    });
    await tagReportRepository.incrementCreatorFlagCount(creatorId);
  },

  listReports(query: ListTagReportsQuery): Promise<TagReportPage> {
    return tagReportRepository.listForAdmin(query);
  },

  async countOpen(): Promise<{ openCount: number }> {
    return { openCount: await tagReportRepository.countOpen() };
  },

  async resolveReport(
    reportId: string,
    reviewedById: string,
    { status, resolutionNote, takeDownTag }: ResolveTagReportBody,
  ): Promise<{ tagTakenDown: boolean }> {
    const report = await tagReportRepository.findResolvableReport(reportId);
    if (!report) {
      throw new AppError("TAG_REPORT_NOT_FOUND", "This report no longer exists.", NOT_FOUND_STATUS);
    }
    if (report.status !== TagReportStatus.OPEN) {
      throw new AppError(
        "TAG_REPORT_ALREADY_RESOLVED",
        "This report has already been resolved.",
        CONFLICT_STATUS,
      );
    }

    let tagTakenDown = false;
    if (takeDownTag) {
      tagTakenDown = await tagReviewService.takeDownTagAsPlatform(report.tagId, reviewedById, {
        reason: TagRejectionReason.COUNTERFEIT_SUSPECTED,
        note: resolutionNote ?? "Removed by Outfiqe trust & safety after a report.",
      });
      if (!tagTakenDown) {
        logger.warn(
          `Tag ${report.tagId} could not be taken down for report ${reportId} (already resolved).`,
        );
      }
    }

    await tagReportRepository.markResolved(reportId, {
      status,
      resolutionNote: resolutionNote ?? null,
      reviewedById,
    });

    return { tagTakenDown };
  },
};
