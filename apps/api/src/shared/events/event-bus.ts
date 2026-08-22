import logger from "#lib/winston.utils.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import { STREAM_MAX_LEN } from "./event-bus.constants.js";
import type { DomainEvent, DomainEventPayloads } from "./event-bus.types.js";
import { serializeEventPayload } from "./event-bus.utils.js";

export const DomainEvents = {
  USER_CREATED: "user.created",
  USER_DELETED: "user.deleted",
  USER_EMAIL_VERIFIED: "user.email.verified",
  USER_PASSWORD_RESET: "user.password.reset",
  BRAND_OWNER_REGISTERED: "brand.owner.registered",
  ADMIN_REGISTERED: "admin.registered",
  LOOK_CREATED: "look.created",
  LOOK_LIKED: "look.liked",
  LOOK_UNLIKED: "look.unliked",
  LOOK_SAVED: "look.saved",
  LOOK_COMMENTED: "look.commented",
  LOOK_VIEWED: "look.viewed",
  USER_FOLLOWED: "user.followed",
  USER_UNFOLLOWED: "user.unfollowed",
  BRAND_FOLLOWED: "brand.followed",
  BRAND_UNFOLLOWED: "brand.unfollowed",
  LEADERBOARD_BRAND_UPDATED: "leaderboard.brand.updated",
  LEADERBOARD_CREATOR_UPDATED: "leaderboard.creator.updated",
  PRODUCT_PURCHASED: "product.purchased",
  PRODUCT_TAGGED: "product.tagged",
  SALE_GENERATED: "sale.generated",
  ACHIEVEMENT_UNLOCKED: "achievement.unlocked",
  LEVEL_UP: "user.leveled_up",
  BRAND_APPLICATION_SUBMITTED: "brand.application.submitted",
  ORDER_STATUS_CHANGED: "order.status.changed",
} as const;

// A Redis hiccup must never fail the caller's request (like/comment/follow/etc.) — log and move on,
// the same best-effort treatment the rest of the codebase already gives Redis (cache, rate limit).
const publishDomainEvent = async <E extends DomainEvent>(
  event: E,
  payload: DomainEventPayloads[E],
): Promise<void> => {
  try {
    await redis.xadd(
      redisKeys.stream(event),
      "MAXLEN",
      "~",
      STREAM_MAX_LEN,
      "*",
      "payload",
      serializeEventPayload(payload),
    );
  } catch (error) {
    logger.error(`Failed to publish domain event ${event}: ${describeError(error)}`);
  }
};

export const eventBus = {
  publish: publishDomainEvent,
};
