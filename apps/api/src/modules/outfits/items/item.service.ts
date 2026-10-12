import { findPlacementRefusal, OUTFIT_PLACEMENT_REFUSAL } from "@outfiqe/utils";

import { OutfitEventType } from "#generated/prisma/enums.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";

import { outfitMemberRepository } from "../members/member.repository.js";
import { DRAFT_ONLY, OUTFIT_IDEMPOTENCY_ENDPOINT } from "../outfit.constants.js";
import { outfitErrors } from "../outfit.errors.js";
import type {
  OutfitSlotParam,
  OutfitSlotPositionParam,
  PlaceItemBody,
  ReorderSlotBody,
  SetHappyBody,
} from "../outfit.schemas.js";
import { hasStock, toBoardItem, toSlotRule } from "../outfit.utils.js";
import {
  OUTFIT_WRITE_ACCESS,
  type OutfitWriteCall,
  type OutfitWriteResult,
  runOutfitWrite,
  toWriteRequest,
} from "../outfit.write.js";
import { outfitItemRepository } from "./item.repository.js";

export const outfitItemService = {
  placeItem(
    call: OutfitWriteCall,
    { slotKey, position }: Omit<OutfitSlotPositionParam, "id">,
    { productId }: PlaceItemBody,
  ): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.PLACE_ITEM, {
        slotKey,
        position,
        productId,
      }),
      access: OUTFIT_WRITE_ACCESS.ANY_MEMBER,
      allowedStatuses: DRAFT_ONLY,
      apply: async ({ tx, outfit, actor }) => {
        const product = await outfitItemRepository.findPlaceableProduct(tx, productId);
        if (!product || !hasStock(product.sizes)) throw outfitErrors.productUnavailable();

        const slots = await outfitItemRepository.listSlots(tx, outfit.id);
        const items = await outfitItemRepository.listRuleItems(tx, outfit.id);
        const maxItemsPerBoard = await platformSettingsService.get("outfit.maxItemsPerBoard");
        const refusal = findPlacementRefusal({
          slots: slots.map(toSlotRule),
          items: items.map(toBoardItem),
          placement: {
            slotKey,
            position,
            productId,
            productTypeId: product.productTypeId,
            addedById: actor.id,
          },
          limits: { maxItemsPerBoard, maxItemsPerMember: outfit.maxItemsPerMember },
        });
        if (refusal) throw outfitErrors.placementRefused(refusal);

        const slot = slots.find((candidate) => candidate.key === slotKey);
        if (!slot) throw outfitErrors.placementRefused(OUTFIT_PLACEMENT_REFUSAL.UNKNOWN_SLOT);

        const replacedItem = items.find(
          (item) => item.slotKey === slotKey && item.position === position,
        );
        await outfitItemRepository.clearHappiness(tx, outfit.id);

        if (replacedItem) {
          await outfitItemRepository.replaceItemProduct(tx, replacedItem.id, {
            productId,
            addedById: actor.id,
          });
          return {
            eventType: OutfitEventType.ITEM_SWAPPED,
            payload: { slotKey, position, productId, replacedProductId: replacedItem.productId },
          };
        }

        await outfitItemRepository.createItem(tx, {
          outfitId: outfit.id,
          outfitSlotId: slot.id,
          position,
          productId,
          addedById: actor.id,
        });
        return { eventType: OutfitEventType.ITEM_ADDED, payload: { slotKey, position, productId } };
      },
    });
  },

  removeItem(
    call: OutfitWriteCall,
    { slotKey, position }: Omit<OutfitSlotPositionParam, "id">,
  ): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.REMOVE_ITEM, {
        slotKey,
        position,
      }),
      access: OUTFIT_WRITE_ACCESS.ANY_MEMBER,
      allowedStatuses: DRAFT_ONLY,
      apply: async ({ tx, outfit }) => {
        const items = await outfitItemRepository.listRuleItems(tx, outfit.id);
        const removedItem = items.find(
          (item) => item.slotKey === slotKey && item.position === position,
        );
        if (!removedItem) throw outfitErrors.itemNotFound();

        await outfitItemRepository.deleteItem(tx, removedItem.id);
        await outfitItemRepository.clearHappiness(tx, outfit.id);
        return {
          eventType: OutfitEventType.ITEM_REMOVED,
          payload: { slotKey, position, productId: removedItem.productId },
        };
      },
    });
  },

  reorderSlot(
    call: OutfitWriteCall,
    { slotKey }: Omit<OutfitSlotParam, "id">,
    { productIds }: ReorderSlotBody,
  ): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.REORDER_SLOT, {
        slotKey,
        productIds,
      }),
      access: OUTFIT_WRITE_ACCESS.ANY_MEMBER,
      allowedStatuses: DRAFT_ONLY,
      apply: async ({ tx, outfit }) => {
        const slots = await outfitItemRepository.listSlots(tx, outfit.id);
        const slot = slots.find((candidate) => candidate.key === slotKey);
        if (!slot) throw outfitErrors.placementRefused(OUTFIT_PLACEMENT_REFUSAL.UNKNOWN_SLOT);

        const slotItems = (await outfitItemRepository.listRuleItems(tx, outfit.id)).filter(
          (item) => item.slotKey === slotKey,
        );
        const itemIdByProductId = new Map(slotItems.map((item) => [item.productId, item.id]));
        const orderedItemIds = productIds.map((productId) => itemIdByProductId.get(productId));
        const listsEveryItemOnce =
          productIds.length === slotItems.length &&
          orderedItemIds.every((itemId): itemId is string => itemId !== undefined);
        if (!listsEveryItemOnce) throw outfitErrors.reorderMismatch();

        await outfitItemRepository.setItemPositions(
          tx,
          slot,
          orderedItemIds.filter((itemId): itemId is string => itemId !== undefined),
        );
        await outfitItemRepository.clearHappiness(tx, outfit.id);
        return { eventType: OutfitEventType.EXTRAS_REORDERED, payload: { slotKey, productIds } };
      },
    });
  },

  setHappy(call: OutfitWriteCall, { isHappy }: SetHappyBody): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.SET_HAPPY, { isHappy }),
      access: OUTFIT_WRITE_ACCESS.ANY_MEMBER,
      allowedStatuses: DRAFT_ONLY,
      apply: async ({ tx, outfit, actor }) => {
        await outfitItemRepository.setHappy(tx, outfit.id, actor.id, isHappy);
        const members = await outfitMemberRepository.listMembers(tx, outfit.id);
        return {
          eventType: OutfitEventType.MEMBER_HAPPY,
          payload: {
            userId: actor.id,
            isHappy,
            isEveryoneHappy: members.every((member) => member.isHappy),
          },
        };
      },
    });
  },
};
