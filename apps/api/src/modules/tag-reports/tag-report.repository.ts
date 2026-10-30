import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { TagReportReason, TagReportSource, TagReviewStatus } from "#generated/prisma/enums.js";
import { TagReportStatus } from "#generated/prisma/enums.js";
import {
  buildCursorPage,
  decodeCursor,
  encodeCursor,
  NEXT_PAGE_PROBE_ROWS,
} from "#lib/pagination.utils.js";

import type { ReportableTag, TagReportListItem, TagReportPage } from "./tag-report.types.js";

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

type TagReportListRow = Prisma.TagReviewReportGetPayload<{ include: typeof listInclude }>;

const buildReportCursorWhere = (cursor?: string): Prisma.TagReviewReportWhereInput => {
  const decodedCursor = decodeCursor<ReportCursor>(cursor);
  if (!decodedCursor) return {};

  const { c: cursorCreatedAt, i: cursorReportId } = decodedCursor;
  return {
    OR: [
      { createdAt: { lt: new Date(cursorCreatedAt) } },
      { AND: [{ createdAt: new Date(cursorCreatedAt) }, { id: { lt: cursorReportId } }] },
    ],
  };
};

const toTagReportListItem = (row: TagReportListRow): TagReportListItem => {
  const { creatorLookProduct: tag } = row;
  const { creatorLook: look, product } = tag;
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
      lookId: look.id,
      lookImageUrl: look.imageUrl,
      reviewStatus: tag.reviewStatus,
      sizeWorn: tag.sizeWorn,
      product: {
        id: product.id,
        name: product.name,
        brandId: product.brandId,
        brandName: product.brand.name,
      },
      creator: {
        id: look.creator.id,
        name: look.creator.name,
        handle: look.creator.handle,
        counterfeitFlagCount: look.creator.tagCounterfeitFlagCount,
      },
    },
  };
};

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
    return prisma.tagReviewReport.count({ where: { status: TagReportStatus.OPEN } });
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
    const rows = await prisma.tagReviewReport.findMany({
      where: { ...(status ? { status } : {}), ...buildReportCursorWhere(cursor) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + NEXT_PAGE_PROBE_ROWS,
      include: listInclude,
    });

    const { items: pageRows, nextCursor } = buildCursorPage(rows, limit, (row) =>
      encodeCursor<ReportCursor>({ c: row.createdAt.toISOString(), i: row.id }),
    );

    return { items: pageRows.map(toTagReportListItem), nextCursor };
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
