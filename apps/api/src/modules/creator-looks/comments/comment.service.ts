import { HTTP_STATUS } from "#constants/http.constants.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { UserRole } from "#generated/prisma/enums.js";
import { assertContentAllowed } from "#lib/content-check.utils.js";
import { assertCanEngage } from "#lib/engagement-guard.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { VALIDATION_STATUS } from "../creator-look.constants.js";
import { isPlatformModerator, requireActiveLook } from "../creator-look.guards.js";
import type { CommentPage, CommentReplyPage } from "../creator-look.types.js";
import { creatorLookCommentRepository } from "./comment.repository.js";

const requireTopLevelComment = async (
  lookId: string,
  commentId: string,
): Promise<{ id: string; creatorLookId: string; userId: string }> => {
  const comment = await creatorLookCommentRepository.findCommentById(commentId);
  if (!comment || comment.creatorLookId !== lookId) {
    throw new AppError("COMMENT_NOT_FOUND", "This chime no longer exists.", HTTP_STATUS.NOT_FOUND);
  }
  if (comment.parentCommentId !== null) {
    throw new AppError(
      "COMMENT_NOT_TOP_LEVEL",
      "You can only reply to a top-level chime.",
      VALIDATION_STATUS,
    );
  }
  return comment;
};

export const creatorLookCommentService = {
  async removeComment(
    lookId: string,
    commentId: string,
    principal: { userId: string; role: UserRole },
  ): Promise<void> {
    const comment = await creatorLookCommentRepository.findCommentById(commentId);
    if (!comment || comment.creatorLookId !== lookId) {
      throw new AppError(
        "COMMENT_NOT_FOUND",
        "This chime no longer exists.",
        HTTP_STATUS.NOT_FOUND,
      );
    }

    const isOwner = comment.userId === principal.userId;
    const isModerator = !isOwner && (await isPlatformModerator(principal));
    if (!isOwner && !isModerator) {
      throw new AppError(
        "COMMENT_NOT_FOUND",
        "This chime no longer exists.",
        HTTP_STATUS.NOT_FOUND,
      );
    }

    await creatorLookCommentRepository.softDeleteComment({
      commentId,
      lookId,
      parentCommentId: comment.parentCommentId,
    });

    if (isModerator) {
      await platformAudit.record({
        actorUserId: principal.userId,
        action: PLATFORM_AUDIT_ACTION.CREATOR_LOOK_COMMENT_REMOVED_BY_ADMIN,
        summary: `Removed a chime by ${comment.userId}`,
        onBehalfOfUserId: comment.userId,
        targetType: "CreatorLookComment",
        targetId: commentId,
      });
    }
  },

  async listComments(
    lookId: string,
    query: { cursor?: string; limit: number },
  ): Promise<CommentPage> {
    await requireActiveLook(lookId);
    return creatorLookCommentRepository.listComments(lookId, query);
  },

  async addComment(lookId: string, userId: string, body: string) {
    await assertCanEngage(userId);
    assertContentAllowed(body);
    const look = await requireActiveLook(lookId);
    const comment = await creatorLookCommentRepository.createComment(lookId, userId, body);
    await eventBus.publish(DomainEvents.LOOK_COMMENTED, {
      lookId,
      creatorId: look.creatorId,
      commentId: comment.id,
      userId,
    });
    return comment;
  },

  async listReplies(
    lookId: string,
    commentId: string,
    query: { cursor?: string; limit: number },
  ): Promise<CommentReplyPage> {
    await requireActiveLook(lookId);
    await requireTopLevelComment(lookId, commentId);
    return creatorLookCommentRepository.listReplies(commentId, query);
  },

  async addReply(lookId: string, commentId: string, userId: string, body: string) {
    await assertCanEngage(userId);
    assertContentAllowed(body);
    const look = await requireActiveLook(lookId);
    const parentComment = await requireTopLevelComment(lookId, commentId);
    const reply = await creatorLookCommentRepository.createReply(lookId, commentId, userId, body);
    await eventBus.publish(DomainEvents.LOOK_COMMENT_REPLIED, {
      lookId,
      creatorId: look.creatorId,
      parentCommentId: commentId,
      parentCommentAuthorId: parentComment.userId,
      replyId: reply.id,
      userId,
    });
    return reply;
  },
};
