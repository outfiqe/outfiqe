import { OutfitEventType, OutfitStatus, OutfitVisibility } from "#generated/prisma/enums.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";

import { OUTFIT_IDEMPOTENCY_ENDPOINT } from "./outfit.constants.js";
import { outfitErrors } from "./outfit.errors.js";
import { requireReachablePeople } from "./outfit.people.js";
import { outfitRepository } from "./outfit.repository.js";
import type { SetVisibilityBody } from "./outfit.schemas.js";
import {
  OUTFIT_WRITE_ACCESS,
  type OutfitWriteCall,
  type OutfitWriteResult,
  runOutfitWrite,
  toWriteRequest,
} from "./outfit.write.js";

const NOT_ARCHIVED = [OutfitStatus.DRAFT, OutfitStatus.LOCKED] as const;
const NONE = 0;
const NO_SHARES_REMOVED = 0;

export const outfitVisibilityService = {
  setVisibility(
    call: OutfitWriteCall,
    { visibility, shareWithUserIds }: SetVisibilityBody,
  ): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.SET_VISIBILITY, {
        visibility,
        shareWithUserIds: shareWithUserIds ?? [],
      }),
      access: OUTFIT_WRITE_ACCESS.OWNER_ONLY,
      allowedStatuses: NOT_ARCHIVED,
      apply: async ({ tx, outfit, actor }) => {
        const isPrivate = visibility === OutfitVisibility.PRIVATE;
        const publishedVersion = isPrivate
          ? outfit.publishedVersion
          : await outfitRepository.findLatestSnapshotVersion(tx, outfit.id);
        if (!isPrivate && publishedVersion === null) throw outfitErrors.neverLocked();
        if (visibility === OutfitVisibility.PUBLIC) {
          const isPublicFeedOn = await featureFlagsService.isEnabledForUser(
            "outfit_public_feed",
            actor.id,
          );
          if (!isPublicFeedOn) throw outfitErrors.publicFeedUnavailable();
        }

        const members = await outfitRepository.listMembers(tx, outfit.id);
        const memberIds = new Set(members.map((member) => member.userId));
        const newRecipientIds = (shareWithUserIds ?? []).filter((userId) => !memberIds.has(userId));
        const isSendingToPeople = newRecipientIds.length > NONE;
        if (isSendingToPeople) {
          await requireReachablePeople(tx, actor, newRecipientIds);
          await outfitRepository.addShares(tx, outfit.id, newRecipientIds, actor.id);
        }

        await outfitRepository.update(tx, outfit.id, { visibility, publishedVersion });
        return {
          eventType: isSendingToPeople
            ? OutfitEventType.SHARED
            : OutfitEventType.VISIBILITY_CHANGED,
          payload: { visibility, publishedVersion, sharedWithUserIds: newRecipientIds },
        };
      },
    });
  },

  removeShare(call: OutfitWriteCall, userId: string): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.REMOVE_SHARE, { userId }),
      access: OUTFIT_WRITE_ACCESS.OWNER_ONLY,
      allowedStatuses: NOT_ARCHIVED,
      apply: async ({ tx, outfit }) => {
        const removedCount = await outfitRepository.removeShare(tx, outfit.id, userId);
        if (removedCount === NO_SHARES_REMOVED) throw outfitErrors.shareNotFound();
        return {
          eventType: OutfitEventType.VISIBILITY_CHANGED,
          payload: { visibility: outfit.visibility, removedShareUserId: userId },
        };
      },
    });
  },
};
