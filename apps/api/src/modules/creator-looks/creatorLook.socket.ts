import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";
import { commentsRoom, SOCKET_EVENTS } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";
import type {
  CommentCreatedPayload,
  CommentReplyCreatedPayload,
  CommentSubscriptionPayload,
} from "#socket/socket.types.js";

import { creatorLookRepository } from "./creatorLook.repository.js";
import { feedSyncRequestSchema } from "./creatorLook.schemas.js";
import { creatorLookService } from "./creatorLook.service.js";

export const registerCreatorLookSocketHandlers = (): void => {
  getIO().on("connection", (socket) => {
    socket.on(SOCKET_EVENTS.FEED_SYNC_REQUEST, async (payload) => {
      const parsed = feedSyncRequestSchema.safeParse(payload);
      if (!parsed.success) return;

      try {
        const count = await creatorLookService.countNewSince(socket.data.auth?.userId, {
          tab: parsed.data.tab,
          since: new Date(parsed.data.since),
        });
        socket.emit(SOCKET_EVENTS.FEED_SYNC_RESULT, { count });
      } catch (error) {
        logger.error(`Failed to compute feed sync count: ${describeError(error)}`);
      }
    });

    socket.on(SOCKET_EVENTS.COMMENTS_SUBSCRIBE, ({ lookId }: CommentSubscriptionPayload) => {
      if (!lookId) return;
      void socket.join(commentsRoom(lookId));
    });

    socket.on(SOCKET_EVENTS.COMMENTS_UNSUBSCRIBE, ({ lookId }: CommentSubscriptionPayload) => {
      if (!lookId) return;
      void socket.leave(commentsRoom(lookId));
    });
  });
};

export const registerCommentEventConsumer = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_COMMENTED,
    groupName: "socket-broadcast",
    handler: async (event): Promise<void> => {
      try {
        const comment = await creatorLookRepository.findCommentRecordById(event.commentId);
        if (!comment) return;

        const payload: CommentCreatedPayload = {
          lookId: event.lookId,
          id: comment.id,
          userId: comment.userId,
          userName: comment.userName,
          userHandle: comment.userHandle,
          userAvatarUrl: comment.userAvatarUrl,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
          replyCount: comment.replyCount,
        };
        getIO().to(commentsRoom(event.lookId)).emit(SOCKET_EVENTS.COMMENT_CREATED, payload);
      } catch (error) {
        logger.error(
          `Failed to broadcast ${SOCKET_EVENTS.COMMENT_CREATED}: ${describeError(error)}`,
        );
      }
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LOOK_COMMENT_REPLIED,
    groupName: "socket-broadcast",
    handler: async (event): Promise<void> => {
      try {
        const reply = await creatorLookRepository.findReplyRecordById(event.replyId);
        if (!reply) return;

        const payload: CommentReplyCreatedPayload = {
          lookId: event.lookId,
          id: reply.id,
          parentCommentId: reply.parentCommentId,
          userId: reply.userId,
          userName: reply.userName,
          userHandle: reply.userHandle,
          userAvatarUrl: reply.userAvatarUrl,
          body: reply.body,
          createdAt: reply.createdAt.toISOString(),
        };
        getIO().to(commentsRoom(event.lookId)).emit(SOCKET_EVENTS.COMMENT_REPLY_CREATED, payload);
      } catch (error) {
        logger.error(
          `Failed to broadcast ${SOCKET_EVENTS.COMMENT_REPLY_CREATED}: ${describeError(error)}`,
        );
      }
    },
  });
};
