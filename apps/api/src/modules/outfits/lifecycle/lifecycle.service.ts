import { OutfitEventType, OutfitStatus, OutfitVisibility } from "#generated/prisma/enums.js";
import { assertContentAllowed } from "#lib/content-check.utils.js";
import { buildChatService } from "#modules/chat/build-chat/build-chat.service.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";

import { outfitItemRepository } from "../items/item.repository.js";
import {
  DRAFT_ONLY,
  NONE,
  OUTFIT_CHAT_FALLBACK_NAME,
  OUTFIT_IDEMPOTENCY_ENDPOINT,
} from "../outfit.constants.js";
import { outfitErrors } from "../outfit.errors.js";
import { outfitRepository } from "../outfit.repository.js";
import type { UpdateOutfitSettingsBody } from "../outfit.schemas.js";
import { hasStock, toSnapshotItems } from "../outfit.utils.js";
import {
  OUTFIT_WRITE_ACCESS,
  type OutfitWriteCall,
  type OutfitWriteResult,
  runOutfitWrite,
  toWriteRequest,
} from "../outfit.write.js";

const EMPTY_TOTAL = 0;

const LOCKED_ONLY = [OutfitStatus.LOCKED] as const;
const NOT_ARCHIVED = [OutfitStatus.DRAFT, OutfitStatus.LOCKED] as const;

export const outfitLifecycleService = {
  updateSettings(
    call: OutfitWriteCall,
    changes: UpdateOutfitSettingsBody,
  ): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.UPDATE_SETTINGS, changes),
      access: OUTFIT_WRITE_ACCESS.OWNER_ONLY,
      allowedStatuses: NOT_ARCHIVED,
      apply: async ({ tx, outfit, actor }) => {
        const isTitleChanged = changes.title !== undefined && changes.title !== outfit.title;
        if (isTitleChanged && outfit.visibility === OutfitVisibility.PUBLIC) {
          assertContentAllowed(changes.title);
        }
        await outfitRepository.update(tx, outfit.id, changes);
        if (isTitleChanged && outfit.conversationId) {
          await buildChatService.rename(
            tx,
            outfit.conversationId,
            actor,
            changes.title ?? OUTFIT_CHAT_FALLBACK_NAME,
          );
        }
        return { eventType: OutfitEventType.SETTINGS_CHANGED, payload: changes };
      },
    });
  },

  lock(call: OutfitWriteCall): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.LOCK, {}),
      access: OUTFIT_WRITE_ACCESS.OWNER_ONLY,
      allowedStatuses: DRAFT_ONLY,
      apply: async ({ tx, outfit }) => {
        const board = await outfitItemRepository.loadBoard(tx, outfit.id);
        if (!board) throw outfitErrors.notFound();

        const minItemsToLock = await platformSettingsService.get("outfit.minItemsToLock");
        const products = board.slots.flatMap((slot) => slot.items.map((item) => item.product));
        if (products.length < minItemsToLock) throw outfitErrors.notEnoughItems(minItemsToLock);

        const soldOutProductIds = products
          .filter((product) => !hasStock(product.sizes))
          .map((product) => product.id);
        if (soldOutProductIds.length > NONE) throw outfitErrors.itemsSoldOut(soldOutProductIds);
        if (!board.members.every((member) => member.isHappy)) {
          throw outfitErrors.notEveryoneHappy();
        }

        const snapshotItems = toSnapshotItems(board);
        const total = snapshotItems.reduce((sum, item) => sum + item.unitPrice, EMPTY_TOTAL);
        await outfitRepository.createSnapshot(tx, {
          outfitId: outfit.id,
          version: outfit.version,
          items: snapshotItems,
          total,
          contributorIds: board.members.map((member) => member.userId),
        });
        await outfitRepository.update(tx, outfit.id, {
          status: OutfitStatus.LOCKED,
          lockedAt: new Date(),
        });
        return {
          eventType: OutfitEventType.LOCKED,
          payload: { total, itemCount: snapshotItems.length },
        };
      },
    });
  },

  unlock(call: OutfitWriteCall): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.UNLOCK, {}),
      access: OUTFIT_WRITE_ACCESS.OWNER_ONLY,
      allowedStatuses: LOCKED_ONLY,
      apply: async ({ tx, outfit }) => {
        await outfitRepository.update(tx, outfit.id, {
          status: OutfitStatus.DRAFT,
          lockedAt: null,
        });
        await outfitItemRepository.clearHappiness(tx, outfit.id);
        return { eventType: OutfitEventType.UNLOCKED, payload: {} };
      },
    });
  },

  archive(call: OutfitWriteCall): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.ARCHIVE, {}),
      access: OUTFIT_WRITE_ACCESS.OWNER_ONLY,
      allowedStatuses: NOT_ARCHIVED,
      apply: async ({ tx, outfit }) => {
        await outfitRepository.update(tx, outfit.id, {
          status: OutfitStatus.ARCHIVED,
          archivedAt: new Date(),
        });
        return { eventType: OutfitEventType.ARCHIVED, payload: {} };
      },
    });
  },
};
