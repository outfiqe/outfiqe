import { OutfitMemberRole } from "#generated/prisma/enums.js";
import { parseSnapshotItems } from "#modules/outfits/outfit.utils.js";

import type { AdminBuildDetailRow, AdminBuildSummaryRow } from "./outfit-admin.repository.js";
import type {
  AdminBuildDetail,
  AdminBuildSummary,
  CommissionTierUsage,
} from "./outfit-admin.types.js";

const NOTHING = 0;

const toIsoOrNull = (date: Date | null): string | null => date?.toISOString() ?? null;

export const toAdminBuildSummary = (row: AdminBuildSummaryRow): AdminBuildSummary => {
  const [ownerMembership] = row.members;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    visibility: row.visibility,
    version: row.version,
    owner: ownerMembership?.user ?? null,
    memberCount: row._count.members,
    itemCount: row._count.items,
    photoCount: row._count.photos,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    isStartedInChat: row.sourceConversationId !== null,
    removedAt: toIsoOrNull(row.removedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

export const toAdminBuildDetail = (
  row: AdminBuildDetailRow,
  extras: Pick<AdminBuildDetail, "looks" | "openReportCount">,
): AdminBuildDetail => {
  const owner = row.members.find(({ role }) => role === OutfitMemberRole.OWNER)?.user ?? null;
  const publishedSnapshot = row.snapshots.find(({ version }) => version === row.publishedVersion);
  return {
    ...toAdminBuildSummary({ ...row, members: owner ? [{ user: owner }] : [] }),
    budget: row.budget,
    publishedVersion: row.publishedVersion,
    lockedAt: toIsoOrNull(row.lockedAt),
    archivedAt: toIsoOrNull(row.archivedAt),
    members: row.members.map(({ user, role, isHappy, joinedAt }) => ({
      user,
      role,
      isHappy,
      joinedAt: joinedAt.toISOString(),
    })),
    items: row.slots.flatMap(({ label, items }) =>
      items.map(({ position, product, addedBy }) => ({
        slotLabel: label,
        position,
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        price: product.price,
        addedBy,
      })),
    ),
    versions: row.snapshots.map(({ version, total, items, createdAt }) => ({
      version,
      total,
      itemCount: parseSnapshotItems(items).length,
      lockedAt: createdAt.toISOString(),
    })),
    publishedItems: publishedSnapshot ? parseSnapshotItems(publishedSnapshot.items) : [],
    photos: row.photos.map(({ uploader, createdAt, ...photo }) => ({
      ...photo,
      uploadedBy: uploader,
      createdAt: createdAt.toISOString(),
    })),
    ...extras,
  };
};

export const weekKey = (weekStart: Date): string => weekStart.toISOString();

export const toCountByWeek = (rows: { week_start: Date; count: bigint }[]): Map<string, number> =>
  new Map(rows.map(({ week_start, count }) => [weekKey(week_start), Number(count)]));

export const toCommissionTierUsage = (
  grouped: { tierId: string; _count: { _all: number }; _sum: { amount: number | null } }[],
  tiers: {
    id: string;
    scope: CommissionTierUsage["scope"];
    minPrice: number;
    maxPrice: number | null;
    amount: number;
  }[],
): CommissionTierUsage[] => {
  const tierById = new Map(tiers.map((tier) => [tier.id, tier]));
  return grouped
    .flatMap(({ tierId, _count, _sum }) => {
      const tier = tierById.get(tierId);
      if (!tier) return [];
      return [
        {
          scope: tier.scope,
          tierId,
          minPrice: tier.minPrice,
          maxPrice: tier.maxPrice,
          amount: tier.amount,
          commissionCount: _count._all,
          totalAmount: _sum.amount ?? NOTHING,
        },
      ];
    })
    .sort((left, right) =>
      left.scope === right.scope
        ? left.minPrice - right.minPrice
        : left.scope.localeCompare(right.scope),
    );
};
