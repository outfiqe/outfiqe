import { prisma } from "#db/prisma.js";
import {
  OutfitEventType,
  OutfitMemberRole,
  OutfitStatus,
  OutfitVisibility,
} from "#generated/prisma/enums.js";
import { assertContentAllowed } from "#lib/content-check.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";

import { NONE, OUTFIT_IDEMPOTENCY_ENDPOINT } from "../outfit.constants.js";
import { outfitErrors } from "../outfit.errors.js";
import { requireReachablePeople } from "../outfit.people.js";
import { outfitRepository } from "../outfit.repository.js";
import type { ListOutfitsQuery, SetVisibilityBody } from "../outfit.schemas.js";
import type { OutfitPersonView } from "../outfit.types.js";
import {
  OUTFIT_WRITE_ACCESS,
  type OutfitWriteCall,
  type OutfitWriteResult,
  runOutfitWrite,
  toWriteRequest,
} from "../outfit.write.js";
import { outfitShareRepository } from "./visibility.repository.js";

const NOT_ARCHIVED = [OutfitStatus.DRAFT, OutfitStatus.LOCKED] as const;
const NO_SHARES_REMOVED = 0;

export const outfitVisibilityService = {
  async listRecipients(
    viewerId: string,
    outfitId: string,
    { cursor, limit }: ListOutfitsQuery,
  ): Promise<{ items: OutfitPersonView[]; nextCursor: string | null }> {
    const viewerRole = await outfitRepository.findMemberRole(prisma, outfitId, viewerId);
    if (viewerRole !== OutfitMemberRole.OWNER) throw outfitErrors.notFound();

    const rows = await outfitShareRepository.listRecipients(outfitId, { cursor, limit });
    const { items, nextCursor } = buildCursorPage(rows, limit, ({ userId }) => userId);
    return { items: items.map(({ user }) => user), nextCursor };
  },

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
        const isGoingPublic =
          visibility === OutfitVisibility.PUBLIC && outfit.visibility !== OutfitVisibility.PUBLIC;
        if (visibility === OutfitVisibility.PUBLIC) {
          const isPublicFeedOn = await featureFlagsService.isEnabledForUser(
            "outfit_public_feed",
            actor.id,
          );
          if (!isPublicFeedOn) throw outfitErrors.publicFeedUnavailable();
          assertContentAllowed(outfit.title);
        }

        const members = await outfitRepository.listMembers(tx, outfit.id);
        const memberIds = new Set(members.map((member) => member.userId));
        const requestedRecipientIds = (shareWithUserIds ?? []).filter(
          (userId) => !memberIds.has(userId),
        );
        if (requestedRecipientIds.length > NONE) {
          await requireReachablePeople(tx, actor, requestedRecipientIds);
        }
        const newlySharedUserIds =
          requestedRecipientIds.length > NONE
            ? await outfitRepository.addShares(tx, outfit.id, requestedRecipientIds, actor.id)
            : [];

        await outfitRepository.update(tx, outfit.id, {
          visibility,
          publishedVersion,
          ...(isGoingPublic ? { madePublicAt: new Date() } : {}),
        });
        return {
          eventType:
            newlySharedUserIds.length > NONE
              ? OutfitEventType.SHARED
              : OutfitEventType.VISIBILITY_CHANGED,
          payload: {
            visibility,
            publishedVersion,
            sharedWithUserIds: newlySharedUserIds,
            isNewlyPublic: isGoingPublic,
          },
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
