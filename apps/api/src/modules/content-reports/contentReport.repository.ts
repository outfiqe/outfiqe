import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  type ContentReportReason,
  ContentReportStatus,
  ContentReportTarget,
} from "#generated/prisma/enums.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";

import type {
  ContentReportListItem,
  ContentReportPage,
  ContentReportTargetPreview,
  ReportableTarget,
  ResolvableContentReport,
} from "./contentReport.types.js";

type ReportCursor = { c: string; i: string };

type CreateContentReportData = {
  targetType: ContentReportTarget;
  targetId: string;
  reason: ContentReportReason;
  note: string | null;
  reportedById: string | null;
  reporterIpHash: string | null;
};

const lookTargetSelect = {
  id: true,
  imageUrl: true,
  caption: true,
  deletedAt: true,
  creator: { select: { id: true, name: true, handle: true, contentFlagCount: true } },
} as const;

const commentTargetSelect = {
  id: true,
  creatorLookId: true,
  body: true,
  deletedAt: true,
  user: { select: { id: true, name: true, handle: true, contentFlagCount: true } },
} as const;

const hydrateLookTargets = async (
  lookIds: string[],
): Promise<Map<string, ContentReportTargetPreview>> => {
  if (lookIds.length === 0) return new Map();

  const rows = await prisma.creatorLook.findMany({
    where: { id: { in: lookIds } },
    select: lookTargetSelect,
  });

  return new Map(
    rows.map((row) => [
      row.id,
      {
        lookId: row.id,
        imageUrl: row.imageUrl,
        snippet: row.caption ?? "",
        isRemoved: row.deletedAt !== null,
        author: row.creator,
      },
    ]),
  );
};

const hydrateCommentTargets = async (
  commentIds: string[],
): Promise<Map<string, ContentReportTargetPreview>> => {
  if (commentIds.length === 0) return new Map();

  const rows = await prisma.creatorLookComment.findMany({
    where: { id: { in: commentIds } },
    select: commentTargetSelect,
  });

  return new Map(
    rows.map((row) => [
      row.id,
      {
        lookId: row.creatorLookId,
        imageUrl: null,
        snippet: row.body,
        isRemoved: row.deletedAt !== null,
        author: row.user,
      },
    ]),
  );
};

export const contentReportRepository = {
  async findReportableTarget(
    targetType: ContentReportTarget,
    targetId: string,
  ): Promise<ReportableTarget | null> {
    if (targetType === ContentReportTarget.CREATOR_LOOK) {
      const look = await prisma.creatorLook.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { creatorId: true },
      });
      return look ? { authorId: look.creatorId } : null;
    }

    const comment = await prisma.creatorLookComment.findFirst({
      where: { id: targetId, deletedAt: null },
      select: { userId: true },
    });
    return comment ? { authorId: comment.userId } : null;
  },

  async create(data: CreateContentReportData): Promise<{ id: string }> {
    return prisma.contentReport.create({ data, select: { id: true } });
  },

  incrementUserFlagCount(userId: string): Promise<unknown> {
    return prisma.user.update({
      where: { id: userId },
      data: { contentFlagCount: { increment: 1 } },
    });
  },

  countOpen(): Promise<number> {
    return prisma.contentReport.count({ where: { status: ContentReportStatus.OPEN } });
  },

  async listForAdmin({
    status,
    cursor,
    limit,
  }: {
    status?: ContentReportStatus;
    cursor?: string;
    limit: number;
  }): Promise<ContentReportPage> {
    const decoded = decodeCursor<ReportCursor>(cursor);
    const cursorWhere: Prisma.ContentReportWhereInput = decoded
      ? {
          OR: [
            { createdAt: { lt: new Date(decoded.c) } },
            { AND: [{ createdAt: new Date(decoded.c) }, { id: { lt: decoded.i } }] },
          ],
        }
      : {};

    const rows = await prisma.contentReport.findMany({
      where: { ...(status ? { status } : {}), ...cursorWhere },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: { reportedBy: { select: { name: true } } },
    });

    const { items: pageRows, nextCursor } = buildCursorPage(rows, limit, (row) =>
      encodeCursor<ReportCursor>({ c: row.createdAt.toISOString(), i: row.id }),
    );

    const lookIds = pageRows
      .filter((row) => row.targetType === ContentReportTarget.CREATOR_LOOK)
      .map((row) => row.targetId);
    const commentIds = pageRows
      .filter((row) => row.targetType === ContentReportTarget.CREATOR_LOOK_COMMENT)
      .map((row) => row.targetId);

    const [lookTargets, commentTargets] = await Promise.all([
      hydrateLookTargets(lookIds),
      hydrateCommentTargets(commentIds),
    ]);

    const items: ContentReportListItem[] = pageRows.map((row) => {
      const { targetType, targetId } = row;
      const target =
        (targetType === ContentReportTarget.CREATOR_LOOK
          ? lookTargets.get(targetId)
          : commentTargets.get(targetId)) ?? null;

      return {
        id: row.id,
        targetType,
        targetId,
        reason: row.reason,
        note: row.note,
        status: row.status,
        createdAt: row.createdAt,
        resolvedAt: row.resolvedAt,
        resolutionNote: row.resolutionNote,
        reporterName: row.reportedBy?.name ?? null,
        target,
      };
    });

    return { items, nextCursor };
  },

  async findResolvableReport(id: string): Promise<ResolvableContentReport | null> {
    return prisma.contentReport.findUnique({
      where: { id },
      select: { id: true, status: true, targetType: true, targetId: true },
    });
  },

  async markResolved(
    id: string,
    data: { status: ContentReportStatus; resolutionNote: string | null; resolvedById: string },
  ): Promise<void> {
    await prisma.contentReport.update({
      where: { id },
      data: { ...data, resolvedAt: new Date() },
    });
  },
};
