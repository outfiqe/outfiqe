import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  type ContentReportReason,
  ContentReportStatus,
  ContentReportTarget,
  OutfitMemberRole,
  OutfitPhotoStatus,
  OutfitVisibility,
} from "#generated/prisma/enums.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";

import type {
  ContentReportListItem,
  ContentReportPage,
  ContentReportTargetPreview,
  ReportableTarget,
  ResolvableContentReport,
} from "./content-report.types.js";

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
        outfitId: null,
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
        outfitId: null,
        imageUrl: null,
        snippet: row.body,
        isRemoved: row.deletedAt !== null,
        author: row.user,
      },
    ]),
  );
};

const findBuildOwnerId = async (outfitId: string): Promise<string | null> => {
  const owner = await prisma.outfitMember.findFirst({
    where: { outfitId, role: OutfitMemberRole.OWNER },
    select: { userId: true },
  });
  return owner?.userId ?? null;
};

const hydrateBuildTargets = async (
  outfitIds: string[],
): Promise<Map<string, ContentReportTargetPreview>> => {
  if (outfitIds.length === 0) return new Map();

  const rows = await prisma.outfit.findMany({
    where: { id: { in: outfitIds } },
    select: {
      id: true,
      title: true,
      removedAt: true,
      items: {
        take: 1,
        orderBy: { addedAt: "asc" },
        select: { product: { select: { imageUrl: true } } },
      },
      members: {
        where: { role: OutfitMemberRole.OWNER },
        select: {
          user: { select: { id: true, name: true, handle: true, contentFlagCount: true } },
        },
      },
    },
  });

  return new Map(
    rows.flatMap((row) => {
      const [owner] = row.members;
      if (!owner) return [];
      const [firstItem] = row.items;
      return [
        [
          row.id,
          {
            lookId: null,
            outfitId: row.id,
            imageUrl: firstItem?.product.imageUrl ?? null,
            snippet: row.title ?? "",
            isRemoved: row.removedAt !== null,
            author: owner.user,
          },
        ],
      ];
    }),
  );
};

const hydrateBuildCommentTargets = async (
  commentIds: string[],
): Promise<Map<string, ContentReportTargetPreview>> => {
  if (commentIds.length === 0) return new Map();

  const rows = await prisma.outfitComment.findMany({
    where: { id: { in: commentIds } },
    select: {
      id: true,
      outfitId: true,
      body: true,
      deletedAt: true,
      user: { select: { id: true, name: true, handle: true, contentFlagCount: true } },
    },
  });

  return new Map(
    rows.map((row) => [
      row.id,
      {
        lookId: null,
        outfitId: row.outfitId,
        imageUrl: null,
        snippet: row.body,
        isRemoved: row.deletedAt !== null,
        author: row.user,
      },
    ]),
  );
};

const hydratePhotoTargets = async (
  photoIds: string[],
): Promise<Map<string, ContentReportTargetPreview>> => {
  if (photoIds.length === 0) return new Map();

  const rows = await prisma.outfitPhoto.findMany({
    where: { id: { in: photoIds } },
    select: {
      id: true,
      outfitId: true,
      imageUrl: true,
      status: true,
      uploader: { select: { id: true, name: true, handle: true, contentFlagCount: true } },
    },
  });

  return new Map(
    rows.flatMap((row) =>
      row.uploader
        ? [
            [
              row.id,
              {
                lookId: null,
                outfitId: row.outfitId,
                imageUrl: row.imageUrl,
                snippet: "",
                isRemoved: row.status === OutfitPhotoStatus.REMOVED,
                author: row.uploader,
              },
            ],
          ]
        : [],
    ),
  );
};

const idsOfType = (
  rows: { targetType: ContentReportTarget; targetId: string }[],
  targetType: ContentReportTarget,
): string[] => rows.filter((row) => row.targetType === targetType).map((row) => row.targetId);

export const contentReportRepository = {
  async findReportableTarget(
    targetType: ContentReportTarget,
    targetId: string,
  ): Promise<ReportableTarget | null> {
    switch (targetType) {
      case ContentReportTarget.CREATOR_LOOK: {
        const look = await prisma.creatorLook.findFirst({
          where: { id: targetId, deletedAt: null },
          select: { creatorId: true },
        });
        return look ? { authorId: look.creatorId } : null;
      }
      case ContentReportTarget.CREATOR_LOOK_COMMENT: {
        const comment = await prisma.creatorLookComment.findFirst({
          where: { id: targetId, deletedAt: null },
          select: { userId: true },
        });
        return comment ? { authorId: comment.userId } : null;
      }
      case ContentReportTarget.OUTFIT_BUILD: {
        const build = await prisma.outfit.findFirst({
          where: {
            id: targetId,
            removedAt: null,
            visibility: { in: [OutfitVisibility.PUBLIC, OutfitVisibility.SHARED] },
          },
          select: { id: true },
        });
        const ownerId = build ? await findBuildOwnerId(build.id) : null;
        return ownerId ? { authorId: ownerId } : null;
      }
      case ContentReportTarget.OUTFIT_BUILD_COMMENT: {
        const comment = await prisma.outfitComment.findFirst({
          where: { id: targetId, deletedAt: null },
          select: { userId: true },
        });
        return comment ? { authorId: comment.userId } : null;
      }
      case ContentReportTarget.OUTFIT_PHOTO: {
        const photo = await prisma.outfitPhoto.findFirst({
          where: {
            id: targetId,
            status: { not: OutfitPhotoStatus.REMOVED },
            outfit: {
              removedAt: null,
              visibility: { in: [OutfitVisibility.PUBLIC, OutfitVisibility.SHARED] },
            },
          },
          select: { uploaderId: true },
        });
        return photo?.uploaderId ? { authorId: photo.uploaderId } : null;
      }
    }
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

    const [lookTargets, commentTargets, buildTargets, buildCommentTargets, photoTargets] =
      await Promise.all([
        hydrateLookTargets(idsOfType(pageRows, ContentReportTarget.CREATOR_LOOK)),
        hydrateCommentTargets(idsOfType(pageRows, ContentReportTarget.CREATOR_LOOK_COMMENT)),
        hydrateBuildTargets(idsOfType(pageRows, ContentReportTarget.OUTFIT_BUILD)),
        hydrateBuildCommentTargets(idsOfType(pageRows, ContentReportTarget.OUTFIT_BUILD_COMMENT)),
        hydratePhotoTargets(idsOfType(pageRows, ContentReportTarget.OUTFIT_PHOTO)),
      ]);
    const targetsByType: Record<ContentReportTarget, Map<string, ContentReportTargetPreview>> = {
      [ContentReportTarget.CREATOR_LOOK]: lookTargets,
      [ContentReportTarget.CREATOR_LOOK_COMMENT]: commentTargets,
      [ContentReportTarget.OUTFIT_BUILD]: buildTargets,
      [ContentReportTarget.OUTFIT_BUILD_COMMENT]: buildCommentTargets,
      [ContentReportTarget.OUTFIT_PHOTO]: photoTargets,
    };

    const items: ContentReportListItem[] = pageRows.map((row) => {
      const { targetType, targetId } = row;
      const target = targetsByType[targetType].get(targetId) ?? null;

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
