import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { CreatorStatus, XpActivityType } from "#generated/prisma/enums.js";
import { userRepository } from "#modules/users/user.repository.js";

import { XP_SOURCE } from "./xp.constants.js";
import { xpService } from "./xp.service.js";

const XP_CONSUMER_GROUP = "xp-award";

const isApprovedCreator = async (userId: string): Promise<boolean> => {
  const user = await userRepository.findById(userId);
  return Boolean(user?.isCreator) && user?.creatorStatus === CreatorStatus.APPROVED;
};

export const registerXpEventConsumers = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_CREATED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId }): Promise<void> => {
      await xpService.awardXp({
        userId: creatorId,
        activityType: XpActivityType.LOOK_CREATED,
        relatedEntityId: lookId,
        source: XP_SOURCE.CREATOR_LOOKS,
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LOOK_LIKED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId, userId: likerId }): Promise<void> => {
      if (likerId === creatorId) return;

      await xpService.awardXp({
        userId: creatorId,
        activityType: XpActivityType.LOOK_LIKE_RECEIVED,
        relatedEntityId: lookId,
        source: XP_SOURCE.CREATOR_LOOKS,
        metadata: { likedBy: likerId },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LOOK_SAVED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ lookId, userId: saverId }): Promise<void> => {
      await xpService.awardXp({
        userId: saverId,
        activityType: XpActivityType.LOOK_SAVED,
        relatedEntityId: lookId,
        source: XP_SOURCE.CREATOR_LOOKS,
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LOOK_COMMENTED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId, userId: commenterId }): Promise<void> => {
      await xpService.awardXp({
        userId: commenterId,
        activityType: XpActivityType.LOOK_COMMENTED,
        relatedEntityId: lookId,
        source: XP_SOURCE.CREATOR_LOOKS,
      });

      if (commenterId === creatorId) return;

      await xpService.awardXp({
        userId: creatorId,
        activityType: XpActivityType.LOOK_COMMENT_RECEIVED,
        relatedEntityId: lookId,
        source: XP_SOURCE.CREATOR_LOOKS,
        metadata: { commentedBy: commenterId },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.USER_FOLLOWED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ followerId, followingId }): Promise<void> => {
      if (!(await isApprovedCreator(followingId))) return;

      await xpService.awardXp({
        userId: followerId,
        activityType: XpActivityType.USER_FOLLOWED,
        relatedEntityId: followingId,
        source: XP_SOURCE.FOLLOWS,
      });
    },
  });
};
