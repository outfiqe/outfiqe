import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";

import { logisticsPickupCoverage } from "../logistics.pickup-coverage.js";
import type { FulfilmentAssignment, ResolveFulfilmentAssignmentsInput } from "./flow.types.js";
import { brandShipsAssignment, buildFulfilmentAssignments } from "./flow.utils.js";

const ORDER_LOGISTICS_FLAG = "order_logistics";
const NO_ENABLED_BRANDS = 0;

export const logisticsFlowService = {
  async resolveFulfilmentAssignments({
    brandIds,
  }: ResolveFulfilmentAssignmentsInput): Promise<FulfilmentAssignment[]> {
    const enabledBrandIds = await featureFlagsService.isEnabledForBrands(
      ORDER_LOGISTICS_FLAG,
      brandIds,
    );
    if (enabledBrandIds.size === NO_ENABLED_BRANDS) return brandIds.map(brandShipsAssignment);

    const defaultLocations = await logisticsPickupCoverage.listDefaultLocationsForBrands([
      ...enabledBrandIds,
    ]);
    const hubIdByCoverageKey =
      await logisticsPickupCoverage.findHubIdsByCoverageKey(defaultLocations);
    return buildFulfilmentAssignments(brandIds, defaultLocations, hubIdByCoverageKey);
  },
};
