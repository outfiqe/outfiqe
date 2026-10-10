import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";

import { COMMENT_REPLY_PREVIEW_COUNT } from "../creator-look.constants.js";
import type {
  CommentPage,
  CommentRecord,
  CommentReplyPage,
  CommentReplyRecord,
} from "../creator-look.types.js";
import type { SimpleCursor } from "../creator-look.utils.js";

type CommentUserRow = {
  id: string;
  userId: string;
  body: string;
  createdAt: Date;
  user: { name: string; handle: string; avatarUrl: string | null };
};

const toReplyRecord = (row: CommentUserRow, parentCommentId: string): CommentReplyRecord => ({
  id: row.id,
  parentCommentId,
  userId: row.userId,
  userName: row.user.name,
  userHandle: row.user.handle,
  userAvatarUrl: row.user.avatarUrl,
  body: row.body,
  createdAt: row.createdAt,
});

type RawReplyPreviewRow = {
  id: string;
  parent_comment_id: string;
  user_id: string;
  user_name: string;
  user_handle: string;
  user_avatar_url: string | null;
  body: string;
  created_at: Date;
};

const fetchPreviewReplies = async (
  parentCommentIds: string[],
): Promise<Map<string, CommentReplyRecord[]>> => {
  const previewsByParentId = new Map<string, CommentReplyRecord[]>();
  if (parentCommentIds.length === 0) return previewsByParentId;

  const rows = await prisma.$queryRaw<RawReplyPreviewRow[]>(Prisma.sql`
    SELECT id, parent_comment_id, user_id, user_name, user_handle, user_avatar_url, body, created_at
    FROM (
      SELECT
        c.id,
        c.parent_comment_id,
        c.user_id,
        u.name AS user_name,
        u.handle AS user_handle,
        u.avatar_url AS user_avatar_url,
        c.body,
        c.created_at,
        ROW_NUMBER() OVER (
          PARTITION BY c.parent_comment_id ORDER BY c.created_at ASC, c.id ASC
        ) AS rn
      FROM creator_look_comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.parent_comment_id IN (${Prisma.join(parentCommentIds)})
        AND c.deleted_at IS NULL
    ) ranked
    WHERE rn <= ${COMMENT_REPLY_PREVIEW_COUNT}
    ORDER BY parent_comment_id, created_at ASC
  `);

  for (const row of rows) {
    const preview = previewsByParentId.get(row.parent_comment_id) ?? [];
    preview.push({
      id: row.id,
      parentCommentId: row.parent_comment_id,
      userId: row.user_id,
      userName: row.user_name,
      userHandle: row.user_handle,
      userAvatarUrl: row.user_avatar_url,
      body: row.body,
      createdAt: row.created_at,
    });
    previewsByParentId.set(row.parent_comment_id, preview);
  }

  return previewsByParentId;
};

export const creatorLookCommentRepository = {
  async listComments(
    lookId: string,
    params: { cursor?: string; limit: number },
  ): Promise<CommentPage> {
    const decoded = decodeCursor<SimpleCursor>(params.cursor);
    const cursorWhere: Prisma.CreatorLookCommentWhereInput = decoded
      ? {
          OR: [
            { createdAt: { gt: new Date(decoded.c) } },
            { AND: [{ createdAt: new Date(decoded.c) }, { id: { gt: decoded.i } }] },
          ],
        }
      : {};

    const rows = await prisma.creatorLookComment.findMany({
      where: { creatorLookId: lookId, parentCommentId: null, deletedAt: null, ...cursorWhere },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: params.limit + 1,
      include: { user: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
    });

    const { items: pageRows, nextCursor } = buildCursorPage(rows, params.limit, (row) =>
      encodeCursor<SimpleCursor>({ c: row.createdAt.toISOString(), i: row.id }),
    );

    const previewRepliesByParentId = await fetchPreviewReplies(
      pageRows.filter((row) => row.replyCount > 0).map((row) => row.id),
    );

    return {
      comments: pageRows.map((row): CommentRecord => ({
        id: row.id,
        userId: row.userId,
        userName: row.user.name,
        userHandle: row.user.handle,
        userAvatarUrl: row.user.avatarUrl,
        body: row.body,
        createdAt: row.createdAt,
        replyCount: row.replyCount,
        previewReplies: previewRepliesByParentId.get(row.id) ?? [],
      })),
      nextCursor,
    };
  },

  async createComment(lookId: string, userId: string, body: string): Promise<CommentRecord> {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.creatorLookComment.create({
        data: { creatorLookId: lookId, userId, body },
        include: { user: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
      });
      await tx.creatorLook.update({
        where: { id: lookId },
        data: { commentCount: { increment: 1 } },
      });

      return {
        id: comment.id,
        userId: comment.userId,
        userName: comment.user.name,
        userHandle: comment.user.handle,
        userAvatarUrl: comment.user.avatarUrl,
        body: comment.body,
        createdAt: comment.createdAt,
        replyCount: 0,
        previewReplies: [],
      };
    });
  },

  async findCommentById(commentId: string): Promise<{
    id: string;
    creatorLookId: string;
    userId: string;
    parentCommentId: string | null;
  } | null> {
    return prisma.creatorLookComment.findFirst({
      where: { id: commentId, deletedAt: null },
      select: { id: true, creatorLookId: true, userId: true, parentCommentId: true },
    });
  },

  async softDeleteComment(params: {
    commentId: string;
    lookId: string;
    parentCommentId: string | null;
  }): Promise<void> {
    const { commentId, lookId, parentCommentId } = params;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      if (parentCommentId) {
        await tx.creatorLookComment.update({
          where: { id: commentId },
          data: { deletedAt: now },
        });
        await tx.creatorLookComment.update({
          where: { id: parentCommentId },
          data: { replyCount: { decrement: 1 } },
        });
        await tx.creatorLook.update({
          where: { id: lookId },
          data: { commentCount: { decrement: 1 } },
        });
        return;
      }

      const { count: removedCount } = await tx.creatorLookComment.updateMany({
        where: {
          deletedAt: null,
          OR: [{ id: commentId }, { parentCommentId: commentId }],
        },
        data: { deletedAt: now },
      });
      await tx.creatorLook.update({
        where: { id: lookId },
        data: { commentCount: { decrement: removedCount } },
      });
    });
  },

  async listReplies(
    parentCommentId: string,
    params: { cursor?: string; limit: number },
  ): Promise<CommentReplyPage> {
    const decoded = decodeCursor<SimpleCursor>(params.cursor);
    const cursorWhere: Prisma.CreatorLookCommentWhereInput = decoded
      ? {
          OR: [
            { createdAt: { gt: new Date(decoded.c) } },
            { AND: [{ createdAt: new Date(decoded.c) }, { id: { gt: decoded.i } }] },
          ],
        }
      : {};

    const rows = await prisma.creatorLookComment.findMany({
      where: { parentCommentId, deletedAt: null, ...cursorWhere },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: params.limit + 1,
      include: { user: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
    });

    const { items: pageRows, nextCursor } = buildCursorPage(rows, params.limit, (row) =>
      encodeCursor<SimpleCursor>({ c: row.createdAt.toISOString(), i: row.id }),
    );

    return {
      replies: pageRows.map((row) => toReplyRecord(row, parentCommentId)),
      nextCursor,
    };
  },

  async createReply(
    lookId: string,
    parentCommentId: string,
    userId: string,
    body: string,
  ): Promise<CommentReplyRecord> {
    return prisma.$transaction(async (tx) => {
      const reply = await tx.creatorLookComment.create({
        data: { creatorLookId: lookId, parentCommentId, userId, body },
        include: { user: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
      });
      await tx.creatorLookComment.update({
        where: { id: parentCommentId },
        data: { replyCount: { increment: 1 } },
      });
      await tx.creatorLook.update({
        where: { id: lookId },
        data: { commentCount: { increment: 1 } },
      });

      return toReplyRecord(reply, parentCommentId);
    });
  },

  async findCommentRecordById(commentId: string): Promise<CommentRecord | null> {
    const row = await prisma.creatorLookComment.findFirst({
      where: { id: commentId, deletedAt: null },
      include: { user: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
    });
    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      userName: row.user.name,
      userHandle: row.user.handle,
      userAvatarUrl: row.user.avatarUrl,
      body: row.body,
      createdAt: row.createdAt,
      replyCount: row.replyCount,
      previewReplies: [],
    };
  },

  async findReplyRecordById(replyId: string): Promise<CommentReplyRecord | null> {
    const row = await prisma.creatorLookComment.findFirst({
      where: { id: replyId, deletedAt: null, parentCommentId: { not: null } },
      include: { user: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
    });
    if (!row?.parentCommentId) return null;

    return toReplyRecord(row, row.parentCommentId);
  },
};
