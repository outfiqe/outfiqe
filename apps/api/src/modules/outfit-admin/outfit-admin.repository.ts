import { prismaRead } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type { OutfitVisibility } from "#generated/prisma/enums.js";
import {
  CommissionStatus,
  ContentReportStatus,
  ContentReportTarget,
  OutfitMemberRole,
} from "#generated/prisma/enums.js";
import { outfitPersonSelect } from "#modules/outfits/outfit.query-helpers.js";

import { METRICS_TIME_ZONE, OUTFIT_ADMIN_LIMITS } from "./outfit-admin.constants.js";
import type { ListAdminBuildsQuery } from "./outfit-admin.schemas.js";

const LOOKAHEAD_ROW = 1;
const SKIP_CURSOR_ROW = 1;

const weekStartInMetricsZone = (storedUtcColumn: string): Prisma.Sql =>
  Prisma.sql`date_trunc('week', (${Prisma.raw(storedUtcColumn)} AT TIME ZONE 'UTC') AT TIME ZONE ${METRICS_TIME_ZONE})`;

const adminBuildSummarySelect = {
  id: true,
  title: true,
  status: true,
  visibility: true,
  version: true,
  likeCount: true,
  commentCount: true,
  sourceConversationId: true,
  removedAt: true,
  createdAt: true,
  updatedAt: true,
  members: {
    where: { role: OutfitMemberRole.OWNER },
    select: { user: { select: outfitPersonSelect } },
  },
  _count: { select: { members: true, items: true, photos: true } },
} as const satisfies Prisma.OutfitSelect;

export type AdminBuildSummaryRow = Prisma.OutfitGetPayload<{
  select: typeof adminBuildSummarySelect;
}>;

const adminBuildDetailSelect = {
  ...adminBuildSummarySelect,
  budget: true,
  publishedVersion: true,
  lockedAt: true,
  archivedAt: true,
  members: {
    orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
    select: {
      role: true,
      isHappy: true,
      joinedAt: true,
      user: { select: outfitPersonSelect },
    },
  },
  slots: {
    orderBy: { sortOrder: "asc" },
    select: {
      label: true,
      items: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          product: { select: { id: true, name: true, imageUrl: true, price: true } },
          addedBy: { select: outfitPersonSelect },
        },
      },
    },
  },
  snapshots: {
    orderBy: { version: "desc" },
    select: { version: true, total: true, items: true, createdAt: true },
  },
  photos: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      kind: true,
      status: true,
      imageUrl: true,
      coverPosition: true,
      createdAt: true,
      uploader: { select: outfitPersonSelect },
    },
  },
} as const satisfies Prisma.OutfitSelect;

export type AdminBuildDetailRow = Prisma.OutfitGetPayload<{
  select: typeof adminBuildDetailSelect;
}>;

type WeeklyCountRow = { week_start: Date; count: bigint };
type WeeklyStartRow = { week_start: Date; from_chat: boolean; count: bigint };
type WeeklyOrderRow = { week_start: Date; is_full_set: boolean; count: bigint };

export const outfitAdminRepository = {
  listBuilds({ search, status, visibility, cursor, limit }: ListAdminBuildsQuery) {
    return prismaRead.outfit.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(visibility ? { visibility } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                {
                  members: {
                    some: {
                      role: OutfitMemberRole.OWNER,
                      user: {
                        OR: [
                          { name: { contains: search, mode: "insensitive" } },
                          { handle: { contains: search, mode: "insensitive" } },
                        ],
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + LOOKAHEAD_ROW,
      ...(cursor ? { cursor: { id: cursor }, skip: SKIP_CURSOR_ROW } : {}),
      select: adminBuildSummarySelect,
    });
  },

  findBuild(outfitId: string): Promise<AdminBuildDetailRow | null> {
    return prismaRead.outfit.findUnique({
      where: { id: outfitId },
      select: adminBuildDetailSelect,
    });
  },

  listLooksFromBuild(outfitId: string) {
    return prismaRead.creatorLook.findMany({
      where: { sourceOutfitId: outfitId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sourceOutfitVersion: true,
        deletedAt: true,
        createdAt: true,
        creator: { select: outfitPersonSelect },
      },
    });
  },

  async countOpenReports(outfitId: string, photoIds: string[]): Promise<number> {
    return prismaRead.contentReport.count({
      where: {
        status: ContentReportStatus.OPEN,
        OR: [
          { targetType: ContentReportTarget.OUTFIT_BUILD, targetId: outfitId },
          { targetType: ContentReportTarget.OUTFIT_PHOTO, targetId: { in: photoIds } },
        ],
      },
    });
  },

  listEventsBefore(outfitId: string, beforeVersion: number | undefined) {
    return prismaRead.outfitEvent.findMany({
      where: {
        outfitId,
        ...(beforeVersion === undefined ? {} : { version: { lt: beforeVersion } }),
      },
      orderBy: { version: "desc" },
      take: OUTFIT_ADMIN_LIMITS.HISTORY_PAGE_SIZE + LOOKAHEAD_ROW,
      select: {
        version: true,
        type: true,
        payload: true,
        createdAt: true,
        actor: { select: outfitPersonSelect },
      },
    });
  },

  weekStartsSince(since: Date) {
    return prismaRead.$queryRaw<{ week_start: Date }[]>`
      SELECT generate_series(
        date_trunc('week', ${since}::timestamptz AT TIME ZONE ${METRICS_TIME_ZONE}),
        date_trunc('week', now() AT TIME ZONE ${METRICS_TIME_ZONE}),
        interval '1 week'
      ) AS week_start
    `;
  },

  buildStartsByWeek(since: Date) {
    return prismaRead.$queryRaw<WeeklyStartRow[]>`
      SELECT ${weekStartInMetricsZone("created_at")} AS week_start,
             source_conversation_id IS NOT NULL AS from_chat,
             COUNT(*)::bigint AS count
      FROM outfits
      WHERE created_at >= ${since}
      GROUP BY 1, 2
    `;
  },

  firstLocksByWeek(since: Date) {
    return prismaRead.$queryRaw<WeeklyCountRow[]>`
      SELECT ${weekStartInMetricsZone("first_locked_at")} AS week_start,
             COUNT(*)::bigint AS count
      FROM (
        SELECT outfit_id, MIN(created_at) AS first_locked_at
        FROM outfit_snapshots
        GROUP BY outfit_id
      ) first_locks
      WHERE first_locked_at >= ${since}
      GROUP BY 1
    `;
  },

  madePublicByWeek(since: Date) {
    return prismaRead.$queryRaw<WeeklyCountRow[]>`
      SELECT ${weekStartInMetricsZone("made_public_at")} AS week_start,
             COUNT(*)::bigint AS count
      FROM outfits
      WHERE made_public_at >= ${since}
      GROUP BY 1
    `;
  },

  commentsByWeek(since: Date) {
    return prismaRead.$queryRaw<WeeklyCountRow[]>`
      SELECT ${weekStartInMetricsZone("created_at")} AS week_start,
             COUNT(*)::bigint AS count
      FROM outfit_comments
      WHERE created_at >= ${since} AND deleted_at IS NULL
      GROUP BY 1
    `;
  },

  likesByWeek(since: Date) {
    return prismaRead.$queryRaw<WeeklyCountRow[]>`
      SELECT ${weekStartInMetricsZone("created_at")} AS week_start,
             COUNT(*)::bigint AS count
      FROM outfit_likes
      WHERE created_at >= ${since}
      GROUP BY 1
    `;
  },

  savesByWeek(since: Date) {
    return prismaRead.$queryRaw<WeeklyCountRow[]>`
      SELECT ${weekStartInMetricsZone("created_at")} AS week_start,
             COUNT(*)::bigint AS count
      FROM outfit_saves
      WHERE created_at >= ${since}
      GROUP BY 1
    `;
  },

  buildOrdersByWeek(since: Date) {
    return prismaRead.$queryRaw<WeeklyOrderRow[]>`
      SELECT ${weekStartInMetricsZone("orders.created_at")} AS week_start,
             build_lines.line_count >= jsonb_array_length(outfit_snapshots.items) AS is_full_set,
             COUNT(*)::bigint AS count
      FROM (
        SELECT order_id, attributed_outfit_id, attributed_outfit_version,
               COUNT(DISTINCT product_id) AS line_count
        FROM order_items
        WHERE attributed_outfit_id IS NOT NULL
        GROUP BY order_id, attributed_outfit_id, attributed_outfit_version
      ) build_lines
      JOIN orders ON orders.id = build_lines.order_id
      JOIN outfit_snapshots
        ON outfit_snapshots.outfit_id = build_lines.attributed_outfit_id
       AND outfit_snapshots.version = build_lines.attributed_outfit_version
      WHERE orders.created_at >= ${since}
      GROUP BY 1, 2
    `;
  },

  countByVisibility(visibility: OutfitVisibility): Promise<number> {
    return prismaRead.outfit.count({ where: { visibility, removedAt: null } });
  },

  async commissionByTier(since: Date) {
    const grouped = await prismaRead.creatorCommission.groupBy({
      by: ["tierId"],
      where: {
        createdAt: { gte: since },
        status: { not: CommissionStatus.VOIDED },
      },
      _count: { _all: true },
      _sum: { amount: true },
    });
    const tiers = await prismaRead.commissionTier.findMany({
      where: { id: { in: grouped.map(({ tierId }) => tierId) } },
      select: { id: true, scope: true, minPrice: true, maxPrice: true, amount: true },
    });
    return { grouped, tiers };
  },
};
