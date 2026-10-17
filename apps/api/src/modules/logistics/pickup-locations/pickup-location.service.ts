import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { normalizeCityName } from "#lib/city.utils.js";
import { toE164PhoneNumber } from "#lib/phone.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { logisticsPickupCoverage } from "../logistics.pickup-coverage.js";
import { logisticsPickupLocationRepository } from "./pickup-location.repository.js";
import type { PickupLocationBody } from "./pickup-location.schemas.js";
import type { PickupLocationView } from "./pickup-location.types.js";
import { toPickupLocationView } from "./pickup-location.utils.js";

const MAX_PICKUP_LOCATIONS_PER_BRAND = 10;
const NO_LOCATIONS = 0;

const requireOwnedLocation = async (brandId: string, locationId: string) => {
  const location = await logisticsPickupLocationRepository.findActiveForBrand(brandId, locationId);
  if (!location) {
    throw new AppError(
      "PICKUP_LOCATION_NOT_FOUND",
      "Pickup location not found.",
      HTTP_STATUS.NOT_FOUND,
    );
  }
  return location;
};

const toLocationWriteFields = ({ contactPhone, ...location }: PickupLocationBody) => {
  const contactPhoneE164 = toE164PhoneNumber(contactPhone, location.countryCode);
  if (!contactPhoneE164) {
    throw new AppError(
      "INVALID_PHONE",
      "That contact phone number isn't valid for the location's country.",
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return {
    ...location,
    landmark: location.landmark ?? null,
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
    openingNote: location.openingNote ?? null,
    cityNormalized: normalizeCityName(location.city),
    contactPhoneE164,
  };
};

const findCoveredLocationKeys = async (
  locations: readonly { countryCode: string; cityNormalized: string }[],
): Promise<Set<string>> =>
  new Set((await logisticsPickupCoverage.findHubIdsByCoverageKey(locations)).keys());

const toViewWithCoverage = async (
  location: Parameters<typeof toPickupLocationView>[0],
): Promise<PickupLocationView> => {
  const coveredKeys = await findCoveredLocationKeys([location]);
  return toPickupLocationView(
    location,
    coveredKeys.has(logisticsPickupCoverage.toCoverageKey(location)),
  );
};

const createLocationAsDefaultWhenFirst = async (
  brandId: string,
  fields: ReturnType<typeof toLocationWriteFields>,
) => {
  const isFirstLocation =
    (await logisticsPickupLocationRepository.countActiveForBrand(brandId)) === NO_LOCATIONS;
  try {
    return await logisticsPickupLocationRepository.createLocation(
      prisma,
      brandId,
      fields,
      isFirstLocation,
    );
  } catch (error) {
    if (!isFirstLocation || !isUniqueConstraintError(error)) throw error;
    return logisticsPickupLocationRepository.createLocation(prisma, brandId, fields, false);
  }
};

export const logisticsPickupLocationService = {
  async listPickupLocations(userId: string): Promise<PickupLocationView[]> {
    const brandId = await requireBrandId(userId);
    const locations = await logisticsPickupLocationRepository.listActiveForBrand(brandId);
    const coveredKeys = await findCoveredLocationKeys(locations);
    return locations.map((location) =>
      toPickupLocationView(
        location,
        coveredKeys.has(logisticsPickupCoverage.toCoverageKey(location)),
      ),
    );
  },

  async createPickupLocation(
    userId: string,
    body: PickupLocationBody,
  ): Promise<PickupLocationView> {
    const brandId = await requireBrandId(userId);
    const activeLocationCount =
      await logisticsPickupLocationRepository.countActiveForBrand(brandId);
    if (activeLocationCount >= MAX_PICKUP_LOCATIONS_PER_BRAND) {
      throw new AppError(
        "PICKUP_LOCATION_LIMIT_REACHED",
        `A brand can have up to ${MAX_PICKUP_LOCATIONS_PER_BRAND} pickup locations.`,
        HTTP_STATUS.CONFLICT,
      );
    }
    const location = await createLocationAsDefaultWhenFirst(brandId, toLocationWriteFields(body));
    return toViewWithCoverage(location);
  },

  async updatePickupLocation(
    userId: string,
    locationId: string,
    body: PickupLocationBody,
  ): Promise<PickupLocationView> {
    const brandId = await requireBrandId(userId);
    await requireOwnedLocation(brandId, locationId);
    const location = await logisticsPickupLocationRepository.updateLocation(
      locationId,
      toLocationWriteFields(body),
    );
    return toViewWithCoverage(location);
  },

  async makeDefaultPickupLocation(userId: string, locationId: string): Promise<void> {
    const brandId = await requireBrandId(userId);
    await requireOwnedLocation(brandId, locationId);
    await prisma.$transaction(async (tx) => {
      await logisticsPickupLocationRepository.clearBrandDefault(tx, brandId);
      await logisticsPickupLocationRepository.markDefault(tx, locationId);
    });
  },

  async removePickupLocation(userId: string, locationId: string): Promise<void> {
    const brandId = await requireBrandId(userId);
    const location = await requireOwnedLocation(brandId, locationId);
    await prisma.$transaction(async (tx) => {
      await logisticsPickupLocationRepository.deactivateLocation(tx, locationId);
      if (!location.isDefault) return;
      const replacement = await logisticsPickupLocationRepository.findOldestActiveLocation(
        tx,
        brandId,
      );
      if (replacement) await logisticsPickupLocationRepository.markDefault(tx, replacement.id);
    });
  },
};
