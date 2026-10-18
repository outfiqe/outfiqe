import { FulfilmentMode } from "#generated/prisma/enums.js";

import {
  type DefaultPickupLocation,
  logisticsPickupCoverage,
} from "../logistics.pickup-coverage.js";
import type { FulfilmentAssignment } from "./flow.types.js";

export const brandShipsAssignment = (brandId: string): FulfilmentAssignment => ({
  brandId,
  fulfilmentMode: FulfilmentMode.BRAND_SHIPS,
  hubId: null,
  pickupLocationId: null,
});

export const buildFulfilmentAssignments = (
  brandIds: readonly string[],
  defaultLocations: readonly DefaultPickupLocation[],
  hubIdByCoverageKey: ReadonlyMap<string, string>,
  { hubIdsWithDeliveryPartner }: { hubIdsWithDeliveryPartner: ReadonlySet<string> },
): FulfilmentAssignment[] => {
  const locationByBrandId = new Map(
    defaultLocations.map((location) => [location.brandId, location]),
  );

  return brandIds.map((brandId) => {
    const location = locationByBrandId.get(brandId);
    const hubId = location
      ? hubIdByCoverageKey.get(logisticsPickupCoverage.toCoverageKey(location))
      : undefined;
    if (!location || !hubId || !hubIdsWithDeliveryPartner.has(hubId)) {
      return brandShipsAssignment(brandId);
    }

    return {
      brandId,
      fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
      hubId,
      pickupLocationId: location.id,
    };
  });
};
