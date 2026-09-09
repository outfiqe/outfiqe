import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { TagReportReason, TagReportSource, TagReportStatus } from "#generated/prisma/enums.js";
import type { TagReviewStatus } from "#generated/prisma/enums.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";

import type { ReportableTag, TagReportPage } from "./tagReport.types.js";

type ReportCursor = { c: string; i: string };

type CreateTagReportData = {
  creatorLookProductId: string;
  source: TagReportSource;
  reason: TagReportReason;
  note: string | null;
  reportedById: string | null;
  reporterIpHash: string | null;
};

const listInclude = {
  reportedBy: { select: { name: true } },
  creatorLookProduct: {
    select: {
      id: true,
      reviewStatus: true,
      sizeWorn: true,
      creatorLook: {
        select: {
          id: true,
          imageUrl: true,
          creator: {
            select: { id: true, name: true, handle: true, tagCounterfeitFlagCount: true },
          },
        },
      },
      product: {
        select: { id: true, name: true, brandId: true, brand: { select: { name: true } } },
      },
    },
  },
} as const;

export const tagReportRepository = {
  async findReportableTag(lookId: string, productId: string): Promise<ReportableTag | null> {
    const tag = await prisma.creatorLookProduct.findFirst({
      where: { creatorLookId: lookId, productId, creatorLook: { deletedAt: null } },
      select: { id: true, reviewStatus: true, creatorLook: { select: { creatorId: true } } },
    });
    if (!tag) return null;
    return {
      id: tag.id,
      creatorId: tag.creatorLook.creatorId,
      reviewStatus: tag.reviewStatus,
    };
  },

  async create(data: CreateTagReportData): Promise<{ id: string }> {
    const report = await prisma.tagReviewReport.create({ data, select: { id: true } });
    return report;
  },

  incrementCreatorFlagCount(creatorId: string): Promise<unknown> {
    return prisma.user.update({
      where: { id: creatorId },
      data: { tagCounterfeitFlagCount: { increment: 1 } },
    });
  },

  countOpen(): Promise<number> {
    return prisma.tagReviewReport.count({ where: { status: "OPEN" } });
  },

  async listForAdmin({
    status,
    cursor,
    limit,
  }: {
    status?: TagReportStatus;
    cursor?: string;
    limit: number;
  }): Promise<TagReportPage> {
    const decoded = decodeCursor<ReportCursor>(cursor);
    const cursorWhere: Prisma.TagReviewReportWhereInput = decoded
      ? {
          OR: [
            { createdAt: { lt: new Date(decoded.c) } },
            { AND: [{ createdAt: new Date(decoded.c) }, { id: { lt: decoded.i } }] },
          ],
        }
      : {};

    const rows = await prisma.tagReviewReport.findMany({
      where: { ...(status ? { status } : {}), ...cursorWhere },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: listInclude,
    });

    const { items, nextCursor } = buildCursorPage(rows, limit, (row) =>
      encodeCursor<ReportCursor>({ c: row.createdAt.toISOString(), i: row.id }),
    );

    return {
      items: items.map((row) => {
        const { creatorLookProduct: tag } = row;
        return {
          id: row.id,
          source: row.source,
          reason: row.reason,
          note: row.note,
          status: row.status,
          createdAt: row.createdAt,
          reviewedAt: row.reviewedAt,
          resolutionNote: row.resolutionNote,
          reporterName: row.reportedBy?.name ?? null,
          tag: {
            id: tag.id,
            lookId: tag.creatorLook.id,
            lookImageUrl: tag.creatorLook.imageUrl,
            reviewStatus: tag.reviewStatus,
            sizeWorn: tag.sizeWorn,
            product: {
              id: tag.product.id,
              name: tag.product.name,
              brandId: tag.product.brandId,
              brandName: tag.product.brand.name,
            },
            creator: {
              id: tag.creatorLook.creator.id,
              name: tag.creatorLook.creator.name,
              handle: tag.creatorLook.creator.handle,
              counterfeitFlagCount: tag.creatorLook.creator.tagCounterfeitFlagCount,
            },
          },
        };
      }),
      nextCursor,
    };
  },

  async findResolvableReport(id: string): Promise<{
    id: string;
    status: TagReportStatus;
    tagId: string;
    tagReviewStatus: TagReviewStatus;
  } | null> {
    const report = await prisma.tagReviewReport.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        creatorLookProduct: { select: { id: true, reviewStatus: true } },
      },
    });
    if (!report) return null;
    return {
      id: report.id,
      status: report.status,
      tagId: report.creatorLookProduct.id,
      tagReviewStatus: report.creatorLookProduct.reviewStatus,
    };
  },

  async markResolved(
    id: string,
    data: { status: TagReportStatus; resolutionNote: string | null; reviewedById: string },
  ): Promise<void> {
    await prisma.tagReviewReport.update({
      where: { id },
      data: { ...data, reviewedAt: new Date() },
    });
  },
};
