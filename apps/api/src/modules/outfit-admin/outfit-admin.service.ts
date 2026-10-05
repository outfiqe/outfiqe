import { subWeeks } from "date-fns/subWeeks";

import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { OutfitEventType, OutfitStatus, OutfitVisibility } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { recordOutfitChange } from "#modules/outfits/outfit.changes.js";
import { outfitErrors } from "#modules/outfits/outfit.errors.js";
import { outfitRepository } from "#modules/outfits/outfit.repository.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import {
  BUILD_ORDER_KIND,
  OUTFIT_ADMIN_AUDIT_TARGET_TYPE,
  OUTFIT_ADMIN_LIMITS,
} from "./outfit-admin.constants.js";
import { outfitAdminRepository } from "./outfit-admin.repository.js";
import type { AdminBuildActionBody, ListAdminBuildsQuery } from "./outfit-admin.schemas.js";
import type {
  AdminBuildDetail,
  AdminBuildHistoryPage,
  AdminBuildPage,
  BuildMetrics,
} from "./outfit-admin.types.js";
import {
  toAdminBuildDetail,
  toAdminBuildSummary,
  toCommissionTierUsage,
  toCountByWeek,
  weekKey,
} from "./outfit-admin.utils.js";

const LOCKED_ONLY: readonly OutfitStatus[] = [OutfitStatus.LOCKED];
const NOT_ARCHIVED: readonly OutfitStatus[] = [OutfitStatus.DRAFT, OutfitStatus.LOCKED];
const NOTHING = 0;
const NEXT_VERSION_STEP = 1;
const LAST_ROW_INDEX = -1;
const { HISTORY_PAGE_SIZE } = OUTFIT_ADMIN_LIMITS;

type AdminBuildChange = {
  adminUserId: string;
  outfitId: string;
  reason: string;
  allowedStatuses: readonly OutfitStatus[];
  eventType: OutfitEventType;
  auditAction: string;
  auditSummary: string;
  apply: (tx: Prisma.TransactionClient, outfitId: string) => Promise<void>;
};

const runAdminBuildChange = async ({
  adminUserId,
  outfitId,
  reason,
  allowedStatuses,
  eventType,
  auditAction,
  auditSummary,
  apply,
}: AdminBuildChange): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    const outfit = await outfitRepository.findAccess(tx, outfitId);
    if (!outfit) throw outfitErrors.notFound();
    if (!allowedStatuses.includes(outfit.status)) throw outfitErrors.notEditable(outfit.status);
    const isClaimed = await outfitRepository.bumpVersion(tx, outfitId, outfit.version);
    if (!isClaimed) throw outfitErrors.versionConflict(outfit.version);
    const [admin] = await outfitRepository.findPeople(tx, [adminUserId]);
    if (!admin) throw outfitErrors.notFound();

    await apply(tx, outfitId);
    await recordOutfitChange(tx, {
      outfitId,
      version: outfit.version + NEXT_VERSION_STEP,
      eventType,
      actor: { id: admin.id, name: admin.name },
      details: { byStaff: true, reason },
      buildChatId: null,
    });
  });

  await platformAudit.record({
    actorUserId: adminUserId,
    action: auditAction,
    summary: auditSummary,
    targetType: OUTFIT_ADMIN_AUDIT_TARGET_TYPE,
    targetId: outfitId,
    metadata: { reason },
  });
};

export const outfitAdminService = {
  async listBuilds(query: ListAdminBuildsQuery): Promise<AdminBuildPage> {
    const rows = await outfitAdminRepository.listBuilds(query);
    const { items, nextCursor } = buildCursorPage(rows, query.limit, ({ id }) => id);
    return { items: items.map(toAdminBuildSummary), nextCursor };
  },

  async getBuild(outfitId: string): Promise<AdminBuildDetail> {
    const row = await outfitAdminRepository.findBuild(outfitId);
    if (!row) throw outfitErrors.notFound();
    const [lookRows, openReportCount] = await Promise.all([
      outfitAdminRepository.listLooksFromBuild(outfitId),
      outfitAdminRepository.countOpenReports(
        outfitId,
        row.photos.map(({ id }) => id),
      ),
    ]);
    return toAdminBuildDetail(row, {
      openReportCount,
      looks: lookRows.flatMap(({ id, creator, sourceOutfitVersion, deletedAt, createdAt }) =>
        sourceOutfitVersion === null
          ? []
          : [
              {
                id,
                creator,
                sourceVersion: sourceOutfitVersion,
                isDeleted: deletedAt !== null,
                createdAt: createdAt.toISOString(),
              },
            ],
      ),
    });
  },

  async getBuildHistory(
    outfitId: string,
    beforeVersion: number | undefined,
  ): Promise<AdminBuildHistoryPage> {
    const outfit = await outfitRepository.findAccess(prisma, outfitId);
    if (!outfit) throw outfitErrors.notFound();
    const eventRows = await outfitAdminRepository.listEventsBefore(outfitId, beforeVersion);
    const pageRows = eventRows.slice(NOTHING, HISTORY_PAGE_SIZE);
    const hasMore = eventRows.length > HISTORY_PAGE_SIZE;
    return {
      events: pageRows.map(({ version, type, payload, createdAt, actor }) => ({
        version,
        type,
        actor,
        payload,
        createdAt: createdAt.toISOString(),
      })),
      nextBeforeVersion: hasMore ? (pageRows.at(LAST_ROW_INDEX)?.version ?? null) : null,
    };
  },

  unlockBuild(adminUserId: string, outfitId: string, { reason }: AdminBuildActionBody) {
    return runAdminBuildChange({
      adminUserId,
      outfitId,
      reason,
      allowedStatuses: LOCKED_ONLY,
      eventType: OutfitEventType.UNLOCKED,
      auditAction: PLATFORM_AUDIT_ACTION.OUTFIT_BUILD_UNLOCKED_BY_ADMIN,
      auditSummary: "Unlocked a build",
      apply: async (tx, id) => {
        await outfitRepository.update(tx, id, { status: OutfitStatus.DRAFT, lockedAt: null });
        await outfitRepository.clearHappiness(tx, id);
      },
    });
  },

  archiveBuild(adminUserId: string, outfitId: string, { reason }: AdminBuildActionBody) {
    return runAdminBuildChange({
      adminUserId,
      outfitId,
      reason,
      allowedStatuses: NOT_ARCHIVED,
      eventType: OutfitEventType.ARCHIVED,
      auditAction: PLATFORM_AUDIT_ACTION.OUTFIT_BUILD_ARCHIVED_BY_ADMIN,
      auditSummary: "Archived a build",
      apply: async (tx, id) => {
        await outfitRepository.update(tx, id, {
          status: OutfitStatus.ARCHIVED,
          archivedAt: new Date(),
        });
      },
    });
  },

  async getMetrics(weekCount: number): Promise<BuildMetrics> {
    const since = subWeeks(new Date(), weekCount);
    const [
      weekStarts,
      startRows,
      lockRows,
      publicRows,
      commentRows,
      likeRows,
      saveRows,
      orderRows,
      sharedBuildCount,
      publicBuildCount,
      { grouped, tiers },
    ] = await Promise.all([
      outfitAdminRepository.weekStartsSince(since),
      outfitAdminRepository.buildStartsByWeek(since),
      outfitAdminRepository.firstLocksByWeek(since),
      outfitAdminRepository.madePublicByWeek(since),
      outfitAdminRepository.commentsByWeek(since),
      outfitAdminRepository.likesByWeek(since),
      outfitAdminRepository.savesByWeek(since),
      outfitAdminRepository.buildOrdersByWeek(since),
      outfitAdminRepository.countByVisibility(OutfitVisibility.SHARED),
      outfitAdminRepository.countByVisibility(OutfitVisibility.PUBLIC),
      outfitAdminRepository.commissionByTier(since),
    ]);

    const locksByWeek = toCountByWeek(lockRows);
    const publicByWeek = toCountByWeek(publicRows);
    const commentsByWeek = toCountByWeek(commentRows);
    const likesByWeek = toCountByWeek(likeRows);
    const savesByWeek = toCountByWeek(saveRows);

    const weeks = weekStarts.map(({ week_start }) => {
      const key = weekKey(week_start);
      const countStarts = (isFromChat: boolean) =>
        Number(
          startRows.find((row) => weekKey(row.week_start) === key && row.from_chat === isFromChat)
            ?.count ?? NOTHING,
        );
      const countOrders = (kind: (typeof BUILD_ORDER_KIND)[keyof typeof BUILD_ORDER_KIND]) =>
        Number(
          orderRows.find(
            (row) =>
              weekKey(row.week_start) === key &&
              row.is_full_set === (kind === BUILD_ORDER_KIND.FULL_SET),
          )?.count ?? NOTHING,
        );
      return {
        weekStart: week_start.toISOString(),
        buildsStartedAlone: countStarts(false),
        buildsStartedFromChat: countStarts(true),
        buildsLocked: locksByWeek.get(key) ?? NOTHING,
        buildsMadePublic: publicByWeek.get(key) ?? NOTHING,
        comments: commentsByWeek.get(key) ?? NOTHING,
        likes: likesByWeek.get(key) ?? NOTHING,
        saves: savesByWeek.get(key) ?? NOTHING,
        fullSetOrders: countOrders(BUILD_ORDER_KIND.FULL_SET),
        pickedItemOrders: countOrders(BUILD_ORDER_KIND.PICKED_ITEMS),
      };
    });

    return {
      weeks,
      sharedBuildCount,
      publicBuildCount,
      commissionByTier: toCommissionTierUsage(grouped, tiers),
    };
  },
};
