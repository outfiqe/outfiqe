import { findPlacementRefusal, OUTFIT_PLACEMENT_REFUSAL } from "@outfiqe/utils";

import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { OutfitEventType, OutfitStatus, OutfitVisibility } from "#generated/prisma/enums.js";
import { assertContentAllowed } from "#lib/content-check.utils.js";
import { withIdempotentTransaction } from "#lib/idempotency.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { buildChatService } from "#modules/chat/build-chat.service.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";

import { resolveLiveBoardRole } from "./outfit.access.js";
import { loadBoardView } from "./outfit.board.js";
import { recordOutfitChange } from "./outfit.changes.js";
import {
  OUTFIT_CHAT_FALLBACK_NAME,
  OUTFIT_IDEMPOTENCY_ENDPOINT,
  OUTFIT_LIMITS,
  OUTFIT_VIEWER_ROLE,
} from "./outfit.constants.js";
import { outfitErrors } from "./outfit.errors.js";
import { outfitRepository, type OutfitSlotCopy } from "./outfit.repository.js";
import type {
  CreateOutfitBody,
  ListOutfitsQuery,
  OutfitSlotParam,
  OutfitSlotPositionParam,
  PlaceItemBody,
  ReorderSlotBody,
  SetHappyBody,
  UpdateOutfitSettingsBody,
} from "./outfit.schemas.js";
import type {
  OutfitBoardView,
  OutfitEventsPage,
  OutfitPublishedView,
  OutfitSummaryView,
  OutfitView,
} from "./outfit.types.js";
import {
  hasStock,
  parseSnapshotItems,
  toBoardItem,
  toSlotRule,
  toSnapshotItems,
  toSummaryView,
  toViewerRole,
} from "./outfit.utils.js";
import {
  OUTFIT_WRITE_ACCESS,
  type OutfitWriteCall,
  type OutfitWriteResult,
  runOutfitWrite,
  toWriteRequest,
} from "./outfit.write.js";

const FIRST_VERSION = 0;
const EMPTY_TOTAL = 0;
const NONE = 0;
const LOOKAHEAD_ROW = 1;
const DRAFT_ONLY = [OutfitStatus.DRAFT] as const;
const LOCKED_ONLY = [OutfitStatus.LOCKED] as const;
const NOT_ARCHIVED = [OutfitStatus.DRAFT, OutfitStatus.LOCKED] as const;

const toSlotCopies = (
  slotTypes: Awaited<ReturnType<typeof outfitRepository.listActiveSlotTypesForCopy>>,
): OutfitSlotCopy[] =>
  slotTypes.map((slotType, sortOrder) => ({
    key: slotType.key,
    label: slotType.label,
    icon: slotType.icon,
    maxItems: slotType.maxItems,
    acceptsAnyProductType: slotType.acceptsAnyProductType,
    productTypeIds: slotType.productTypes.map(({ productTypeId }) => productTypeId),
    blocksSlotKeys: slotType.blocks.map(({ blockedSlotType }) => blockedSlotType.key),
    sortOrder,
  }));

const assertCanStartBuildIn = async (
  tx: Prisma.TransactionClient,
  conversationId: string,
  ownerId: string,
): Promise<void> => {
  const conversationExists = await outfitRepository.lockConversation(tx, conversationId);
  const isParticipant =
    conversationExists &&
    (await outfitRepository.isConversationParticipant(tx, conversationId, ownerId));
  if (!isParticipant) throw outfitErrors.conversationNotFound();

  const maxBoardsPerChat = await platformSettingsService.get("outfit.maxBoardsPerChat");
  const buildsInChat = await outfitRepository.countBuildsStartedIn(tx, conversationId);
  if (buildsInChat >= maxBoardsPerChat) throw outfitErrors.tooManyBuildsInChat(maxBoardsPerChat);
};

const loadPublishedView = async (
  outfit: NonNullable<Awaited<ReturnType<typeof outfitRepository.findAccess>>>,
  publishedVersion: number,
): Promise<OutfitPublishedView> => {
  const snapshot = await outfitRepository.findSnapshot(prisma, outfit.id, publishedVersion);
  if (!snapshot) throw outfitErrors.notFound();
  const contributors = await outfitRepository.findPeople(prisma, snapshot.contributorIds);
  return {
    id: outfit.id,
    title: outfit.title,
    visibility: outfit.visibility,
    publishedVersion,
    myRole: OUTFIT_VIEWER_ROLE.VIEWER,
    items: parseSnapshotItems(snapshot.items),
    total: snapshot.total,
    contributors,
    lockedAt: snapshot.createdAt.toISOString(),
  };
};

const canSeePublishedVersion = async (
  outfit: NonNullable<Awaited<ReturnType<typeof outfitRepository.findAccess>>>,
  viewerId: string,
): Promise<boolean> => {
  if (outfit.removedAt !== null) return false;
  if (outfit.visibility === OutfitVisibility.PUBLIC) return true;
  if (outfit.visibility !== OutfitVisibility.SHARED) return false;
  return outfitRepository.hasShare(prisma, outfit.id, viewerId);
};

export const outfitService = {
  create(
    ownerId: string,
    { title, sourceConversationId }: CreateOutfitBody,
    idempotencyKey: string,
  ): Promise<OutfitBoardView> {
    return withIdempotentTransaction(
      {
        userId: ownerId,
        endpoint: OUTFIT_IDEMPOTENCY_ENDPOINT.CREATE,
        key: idempotencyKey,
        requestBody: { title: title ?? null, sourceConversationId: sourceConversationId ?? null },
      },
      async (tx) => {
        if (sourceConversationId) await assertCanStartBuildIn(tx, sourceConversationId, ownerId);

        const slotTypes = await outfitRepository.listActiveSlotTypesForCopy(tx);
        if (slotTypes.length === NONE) throw outfitErrors.noSlotTypes();

        const { id: outfitId } = await outfitRepository.create(tx, {
          title: title ?? null,
          ownerId,
          sourceConversationId: sourceConversationId ?? null,
          slots: toSlotCopies(slotTypes),
        });
        const owner = await outfitRepository.findPersonReference(tx, ownerId);
        if (!owner) throw outfitErrors.notFound();

        await recordOutfitChange(tx, {
          outfitId,
          version: FIRST_VERSION,
          eventType: OutfitEventType.CREATED,
          actor: owner,
          details: { title: title ?? null, sourceConversationId: sourceConversationId ?? null },
          buildChatId: null,
        });
        if (sourceConversationId) {
          await buildChatService.postBuildCard(tx, {
            conversationId: sourceConversationId,
            sender: owner,
            outfitId,
          });
        }
        return loadBoardView(tx, outfitId, OUTFIT_VIEWER_ROLE.OWNER);
      },
    );
  },

  async get(viewerId: string, outfitId: string): Promise<OutfitView> {
    const liveBoardRole = await resolveLiveBoardRole(outfitId, viewerId);
    if (liveBoardRole) {
      return { kind: "board", ...(await loadBoardView(prisma, outfitId, liveBoardRole)) };
    }

    const outfit = await outfitRepository.findAccess(prisma, outfitId);
    if (!outfit || outfit.status === OutfitStatus.ARCHIVED) throw outfitErrors.notFound();

    const { publishedVersion } = outfit;
    if (publishedVersion === null || !(await canSeePublishedVersion(outfit, viewerId))) {
      throw outfitErrors.notFound();
    }
    return { kind: "published", ...(await loadPublishedView(outfit, publishedVersion)) };
  },

  async listEvents(
    viewerId: string,
    outfitId: string,
    sinceVersion: number,
  ): Promise<OutfitEventsPage> {
    const [outfit, liveBoardRole] = await Promise.all([
      outfitRepository.findAccess(prisma, outfitId),
      resolveLiveBoardRole(outfitId, viewerId),
    ]);
    if (!outfit || !liveBoardRole) throw outfitErrors.notFound();

    const pageSize = OUTFIT_LIMITS.EVENTS_PAGE_MAX;
    const events = await outfitRepository.listEventsSince(
      outfitId,
      sinceVersion,
      pageSize + LOOKAHEAD_ROW,
    );
    const hasMore = events.length > pageSize;
    return {
      events: events.slice(0, pageSize).map(({ version, type, actorId, payload, createdAt }) => ({
        version,
        type,
        actorId,
        payload,
        createdAt: createdAt.toISOString(),
      })),
      currentVersion: outfit.version,
      hasMore,
    };
  },

  async listMine(
    userId: string,
    { cursor, limit }: ListOutfitsQuery,
  ): Promise<{ items: OutfitSummaryView[]; nextCursor: string | null }> {
    const rows = await outfitRepository.listForMember(userId, { cursor, limit });
    const { items, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
    const roles = await Promise.all(
      items.map((row) => outfitRepository.findMemberRole(prisma, row.id, userId)),
    );
    return {
      items: items.map((row, index) => toSummaryView(row, toViewerRole(roles[index] ?? null))),
      nextCursor,
    };
  },

  async listSharedWithMe(
    userId: string,
    { cursor, limit }: ListOutfitsQuery,
  ): Promise<{ items: OutfitSummaryView[]; nextCursor: string | null }> {
    const rows = await outfitRepository.listSharedWith(userId, { cursor, limit });
    const { items, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
    return {
      items: items.map((row) => toSummaryView(row, OUTFIT_VIEWER_ROLE.VIEWER)),
      nextCursor,
    };
  },

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
        const product = await outfitRepository.findPlaceableProduct(tx, productId);
        if (!product || !hasStock(product.sizes)) throw outfitErrors.productUnavailable();

        const slots = await outfitRepository.listSlots(tx, outfit.id);
        const items = await outfitRepository.listRuleItems(tx, outfit.id);
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
        await outfitRepository.clearHappiness(tx, outfit.id);

        if (replacedItem) {
          await outfitRepository.replaceItemProduct(tx, replacedItem.id, {
            productId,
            addedById: actor.id,
          });
          return {
            eventType: OutfitEventType.ITEM_SWAPPED,
            payload: { slotKey, position, productId, replacedProductId: replacedItem.productId },
          };
        }

        await outfitRepository.createItem(tx, {
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
        const items = await outfitRepository.listRuleItems(tx, outfit.id);
        const removedItem = items.find(
          (item) => item.slotKey === slotKey && item.position === position,
        );
        if (!removedItem) throw outfitErrors.itemNotFound();

        await outfitRepository.deleteItem(tx, removedItem.id);
        await outfitRepository.clearHappiness(tx, outfit.id);
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
        const slots = await outfitRepository.listSlots(tx, outfit.id);
        const slot = slots.find((candidate) => candidate.key === slotKey);
        if (!slot) throw outfitErrors.placementRefused(OUTFIT_PLACEMENT_REFUSAL.UNKNOWN_SLOT);

        const slotItems = (await outfitRepository.listRuleItems(tx, outfit.id)).filter(
          (item) => item.slotKey === slotKey,
        );
        const itemIdByProductId = new Map(slotItems.map((item) => [item.productId, item.id]));
        const orderedItemIds = productIds.map((productId) => itemIdByProductId.get(productId));
        const listsEveryItemOnce =
          productIds.length === slotItems.length &&
          orderedItemIds.every((itemId): itemId is string => itemId !== undefined);
        if (!listsEveryItemOnce) throw outfitErrors.reorderMismatch();

        await outfitRepository.setItemPositions(
          tx,
          slot,
          orderedItemIds.filter((itemId): itemId is string => itemId !== undefined),
        );
        await outfitRepository.clearHappiness(tx, outfit.id);
        return { eventType: OutfitEventType.EXTRAS_REORDERED, payload: { slotKey, productIds } };
      },
    });
  },

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

  setHappy(call: OutfitWriteCall, { isHappy }: SetHappyBody): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.SET_HAPPY, { isHappy }),
      access: OUTFIT_WRITE_ACCESS.ANY_MEMBER,
      allowedStatuses: DRAFT_ONLY,
      apply: async ({ tx, outfit, actor }) => {
        await outfitRepository.setHappy(tx, outfit.id, actor.id, isHappy);
        const members = await outfitRepository.listMembers(tx, outfit.id);
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

  lock(call: OutfitWriteCall): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.LOCK, {}),
      access: OUTFIT_WRITE_ACCESS.OWNER_ONLY,
      allowedStatuses: DRAFT_ONLY,
      apply: async ({ tx, outfit }) => {
        const board = await outfitRepository.loadBoard(tx, outfit.id);
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
        await outfitRepository.clearHappiness(tx, outfit.id);
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
