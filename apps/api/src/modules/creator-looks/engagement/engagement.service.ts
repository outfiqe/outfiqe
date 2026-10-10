import { HTTP_STATUS } from "#constants/http.constants.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { assertCanEngage } from "#lib/engagement-guard.utils.js";
import { isLikelyBotUserAgent } from "#lib/user-agent.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { requireActiveLook } from "../creator-look.guards.js";
import type { RecordViewBody, TagClickBody } from "../creator-look.schemas.js";
import { creatorLookEngagementRepository } from "./engagement.repository.js";

export const creatorLookEngagementService = {
  async like(lookId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    await assertCanEngage(userId);
    const look = await requireActiveLook(lookId);
    const { likeCount } = await creatorLookEngagementRepository.like(lookId, userId);
    await eventBus.publish(DomainEvents.LOOK_LIKED, { lookId, creatorId: look.creatorId, userId });
    return { liked: true, likeCount };
  },

  async unlike(lookId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const look = await requireActiveLook(lookId);
    const { likeCount, unliked } = await creatorLookEngagementRepository.unlike(lookId, userId);
    if (unliked) {
      await eventBus.publish(DomainEvents.LOOK_UNLIKED, {
        lookId,
        creatorId: look.creatorId,
        userId,
      });
    }
    return { liked: false, likeCount };
  },

  async save(lookId: string, userId: string): Promise<{ saved: boolean; saveCount: number }> {
    const look = await requireActiveLook(lookId);
    const { saveCount } = await creatorLookEngagementRepository.save(lookId, userId);
    await eventBus.publish(DomainEvents.LOOK_SAVED, { lookId, creatorId: look.creatorId, userId });
    return { saved: true, saveCount };
  },

  async unsave(lookId: string, userId: string): Promise<{ saved: boolean; saveCount: number }> {
    await requireActiveLook(lookId);
    const { saveCount } = await creatorLookEngagementRepository.unsave(lookId, userId);
    return { saved: false, saveCount };
  },

  async recordTagClick(
    lookId: string,
    productId: string,
    userId: string | undefined,
    body: TagClickBody,
  ): Promise<void> {
    await requireActiveLook(lookId);

    const tagged = await creatorLookEngagementRepository.tagExists(lookId, productId);
    if (!tagged) {
      throw new AppError(
        "TAG_NOT_FOUND",
        "This product isn't tagged in this look.",
        HTTP_STATUS.NOT_FOUND,
      );
    }

    await creatorLookEngagementRepository.recordTagClick({
      lookId,
      productId,
      userId,
      sessionId: body.sessionId,
      source: body.source,
    });
  },

  async recordView(
    lookId: string,
    viewerId: string | undefined,
    userAgent: string | undefined,
    body: RecordViewBody,
  ): Promise<void> {
    const look = await requireActiveLook(lookId);
    if (viewerId === look.creatorId) return;
    if (isLikelyBotUserAgent(userAgent)) return;

    const { counted } = await creatorLookEngagementRepository.recordView({
      lookId,
      viewerId,
      sessionId: body.sessionId,
    });
    if (!counted) return;

    await eventBus.publish(DomainEvents.LOOK_VIEWED, {
      lookId,
      creatorId: look.creatorId,
      viewerId,
    });
  },
};
