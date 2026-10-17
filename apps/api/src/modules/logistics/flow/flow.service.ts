import { deliveryZoneService } from "#modules/delivery-zones/delivery-zone.service.js";
import { ORDER_LOGISTICS_FLAG } from "#modules/feature-flags/feature-flags.registry.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";

import { logisticsPickupCoverage } from "../logistics.pickup-coverage.js";
import type { FulfilmentAssignment, ResolveFulfilmentAssignmentsInput } from "./flow.types.js";
import { brandShipsAssignment, buildFulfilmentAssignments } from "./flow.utils.js";

const NO_ENABLED_BRANDS = 0;

export const logisticsFlowService = {
  async resolveFulfilmentAssignments({
    brandIds,
    deliveryCity,
    countryCode,
    requiresCashOnDelivery,
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
    const deliveryZoneId = await deliveryZoneService.resolveZoneIdForCity(
      deliveryCity,
      countryCode,
    );
    const hubIdsWithDeliveryPartner = await logisticsPickupCoverage.findHubIdsWithDeliveryPartner({
      hubIds: [...new Set(hubIdByCoverageKey.values())],
      deliveryZoneId,
      requiresCashOnDelivery,
    });
    return buildFulfilmentAssignments(brandIds, defaultLocations, hubIdByCoverageKey, {
      hubIdsWithDeliveryPartner,
    });
  },
};
