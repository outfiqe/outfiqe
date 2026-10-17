import { subDays } from "date-fns/subDays";

import { requireBrandId } from "#lib/brand-guard.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";

import { brandIncidentRepository } from "./brand-incident.repository.js";
import {
  RELIABILITY_REVIEW_INCIDENTS,
  RELIABILITY_WARNING_INCIDENTS,
  RELIABILITY_WINDOW_DAYS,
} from "./reliability.constants.js";
import type { ListBrandIncidentsQuery } from "./reliability.schemas.js";
import type { BrandForReviewView, BrandReliabilityView } from "./reliability.types.js";
import { describeReliabilityLevel } from "./reliability.utils.js";

const MAX_BRANDS_LISTED_FOR_REVIEW = 100;

const reliabilityWindowStart = () => subDays(new Date(), RELIABILITY_WINDOW_DAYS);

export const logisticsReliabilityService = {
  async getMyBrandReliability(
    userId: string,
    { cursor, limit }: ListBrandIncidentsQuery,
  ): Promise<BrandReliabilityView> {
    const brandId = await requireBrandId(userId);
    const since = reliabilityWindowStart();
    const [incidentCount, incidents] = await Promise.all([
      brandIncidentRepository.countIncidentsSince(brandId, since),
      brandIncidentRepository.listIncidentsSince({
        brandId,
        since,
        ...(cursor ? { cursor } : {}),
        limit,
      }),
    ]);
    const { items, nextCursor } = buildCursorPage(incidents, limit, (incident) => incident.id);
    return {
      windowDays: RELIABILITY_WINDOW_DAYS,
      incidentCount,
      level: describeReliabilityLevel(incidentCount),
      warningAt: RELIABILITY_WARNING_INCIDENTS,
      reviewAt: RELIABILITY_REVIEW_INCIDENTS,
      incidents: items.map(({ occurredAt, ...incident }) => ({
        ...incident,
        occurredAt: occurredAt.toISOString(),
      })),
      nextCursor,
    };
  },

  async listBrandsToWatch(): Promise<BrandForReviewView[]> {
    const brandCounts = await brandIncidentRepository.listBrandsAtOrAbove({
      since: reliabilityWindowStart(),
      minimumIncidents: RELIABILITY_WARNING_INCIDENTS,
      limit: MAX_BRANDS_LISTED_FOR_REVIEW,
    });
    const brands = await brandIncidentRepository.findBrandNames(
      brandCounts.map(({ brandId }) => brandId),
    );
    const brandNameById = new Map(brands.map(({ id, name }) => [id, name]));
    return brandCounts.flatMap(({ brandId, _count }) => {
      const brandName = brandNameById.get(brandId);
      return brandName
        ? [
            {
              brandId,
              brandName,
              incidentCount: _count._all,
              level: describeReliabilityLevel(_count._all),
            },
          ]
        : [];
    });
  },
};
