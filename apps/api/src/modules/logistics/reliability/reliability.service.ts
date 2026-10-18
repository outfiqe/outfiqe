import { subDays } from "date-fns/subDays";

import { requireBrandId } from "#lib/brand-guard.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";

import { brandIncidentRepository } from "./brand-incident.repository.js";
import {
  type BrandPickupHistory,
  brandPickupHistoryRepository,
  EMPTY_PICKUP_HISTORY,
} from "./brand-pickup-history.repository.js";
import {
  RELIABILITY_WATCH_LIST_MIN_INCIDENTS,
  RELIABILITY_WINDOW_DAYS,
} from "./reliability.constants.js";
import type { ListBrandIncidentsQuery } from "./reliability.schemas.js";
import type {
  BrandForReviewView,
  BrandReliabilitySummary,
  BrandReliabilityView,
} from "./reliability.types.js";
import {
  calculateIncidentRatePercent,
  describeReliabilityLevel,
  isWithinNewBrandGrace,
} from "./reliability.utils.js";

const MAX_BRANDS_LISTED_FOR_REVIEW = 100;

const summarizeReliability = (
  incidentCount: number,
  pickupHistory: BrandPickupHistory,
  now: Date,
): BrandReliabilitySummary => {
  const { recentPickupCount } = pickupHistory;
  const isNewToPickup = isWithinNewBrandGrace(pickupHistory, now);
  return {
    incidentCount,
    pickupCount: recentPickupCount,
    incidentRatePercent: calculateIncidentRatePercent(incidentCount, recentPickupCount),
    isNewToPickup,
    level: describeReliabilityLevel({
      incidentCount,
      pickupCount: recentPickupCount,
      isNewToPickup,
    }),
  };
};

export const logisticsReliabilityService = {
  async getMyBrandReliability(
    userId: string,
    { cursor, limit }: ListBrandIncidentsQuery,
  ): Promise<BrandReliabilityView> {
    const brandId = await requireBrandId(userId);
    const now = new Date();
    const since = subDays(now, RELIABILITY_WINDOW_DAYS);
    const [incidentCount, incidents, pickupHistoryByBrand] = await Promise.all([
      brandIncidentRepository.countIncidentsSince(brandId, since),
      brandIncidentRepository.listIncidentsSince({
        brandId,
        since,
        ...(cursor ? { cursor } : {}),
        limit,
      }),
      brandPickupHistoryRepository.summarizeHubPickups([brandId], since),
    ]);
    const { items, nextCursor } = buildCursorPage(incidents, limit, (incident) => incident.id);
    return {
      windowDays: RELIABILITY_WINDOW_DAYS,
      ...summarizeReliability(
        incidentCount,
        pickupHistoryByBrand.get(brandId) ?? EMPTY_PICKUP_HISTORY,
        now,
      ),
      incidents: items.map(({ occurredAt, ...incident }) => ({
        ...incident,
        occurredAt: occurredAt.toISOString(),
      })),
      nextCursor,
    };
  },

  async listBrandsToWatch(): Promise<BrandForReviewView[]> {
    const now = new Date();
    const since = subDays(now, RELIABILITY_WINDOW_DAYS);
    const brandCounts = await brandIncidentRepository.listBrandsAtOrAbove({
      since,
      minimumIncidents: RELIABILITY_WATCH_LIST_MIN_INCIDENTS,
      limit: MAX_BRANDS_LISTED_FOR_REVIEW,
    });
    const brandIds = brandCounts.map(({ brandId }) => brandId);
    const [brands, pickupHistoryByBrand] = await Promise.all([
      brandIncidentRepository.findBrandNames(brandIds),
      brandPickupHistoryRepository.summarizeHubPickups(brandIds, since),
    ]);
    const brandNameById = new Map(brands.map(({ id, name }) => [id, name]));
    return brandCounts.flatMap(({ brandId, _count }) => {
      const brandName = brandNameById.get(brandId);
      return brandName
        ? [
            {
              brandId,
              brandName,
              ...summarizeReliability(
                _count._all,
                pickupHistoryByBrand.get(brandId) ?? EMPTY_PICKUP_HISTORY,
                now,
              ),
            },
          ]
        : [];
    });
  },
};
