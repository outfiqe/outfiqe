import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { OutfitEventType, OutfitStatus, OutfitVisibility } from "#generated/prisma/enums.js";
import { withIdempotentTransaction } from "#lib/idempotency.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { buildChatService } from "#modules/chat/build-chat.service.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";

import { outfitItemService } from "./items/item.service.js";
import { outfitLifecycleService } from "./lifecycle/lifecycle.service.js";
import { outfitMemberRepository } from "./members/member.repository.js";
import { resolveLiveBoardRole } from "./outfit.access.js";
import { loadBoardView } from "./outfit.board.js";
import { recordOutfitChange } from "./outfit.changes.js";
import {
  NONE,
  OUTFIT_IDEMPOTENCY_ENDPOINT,
  OUTFIT_LIMITS,
  OUTFIT_VIEWER_ROLE,
} from "./outfit.constants.js";
import { outfitErrors } from "./outfit.errors.js";
import type { OutfitSlotCopy } from "./outfit.query-helpers.js";
import { outfitRepository } from "./outfit.repository.js";
import type { CreateOutfitBody, ListOutfitsQuery } from "./outfit.schemas.js";
import type {
  OutfitBoardView,
  OutfitEventsPage,
  OutfitPublishedView,
  OutfitSummaryView,
  OutfitView,
} from "./outfit.types.js";
import { parseSnapshotItems, toSummaryView, toViewerRole } from "./outfit.utils.js";
import { loadCoversForBuilds } from "./photos/photo.service.js";
import { outfitShareRepository } from "./visibility/visibility.repository.js";

const FIRST_VERSION = 0;

const LOOKAHEAD_ROW = 1;

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
  const contributors = await outfitMemberRepository.findPeople(prisma, snapshot.contributorIds);
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
  return outfitShareRepository.hasShare(prisma, outfit.id, viewerId);
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
        const owner = await outfitMemberRepository.findPersonReference(tx, ownerId);
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
    const [roles, coversByOutfitId] = await Promise.all([
      Promise.all(
        items.map((row) => outfitMemberRepository.findMemberRole(prisma, row.id, userId)),
      ),
      loadCoversForBuilds(
        userId,
        items.map(({ id }) => id),
      ),
    ]);
    return {
      items: items.map((row, index) =>
        toSummaryView(row, toViewerRole(roles[index] ?? null), coversByOutfitId.get(row.id) ?? []),
      ),
      nextCursor,
    };
  },

  async listSharedWithMe(
    userId: string,
    { cursor, limit }: ListOutfitsQuery,
  ): Promise<{ items: OutfitSummaryView[]; nextCursor: string | null }> {
    const rows = await outfitShareRepository.listSharedWith(userId, { cursor, limit });
    const { items, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
    const coversByOutfitId = await loadCoversForBuilds(
      userId,
      items.map(({ id }) => id),
    );
    return {
      items: items.map((row) =>
        toSummaryView(row, OUTFIT_VIEWER_ROLE.VIEWER, coversByOutfitId.get(row.id) ?? []),
      ),
      nextCursor,
    };
  },

  ...outfitItemService,

  ...outfitLifecycleService,
};
