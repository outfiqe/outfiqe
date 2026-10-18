import { COUNTRY_SETTINGS, PLATFORM_DEFAULT_COUNTRY_CODE } from "#constants/country.constants.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { normalizeCityName } from "#lib/city.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { addWorkingDaysAsCalendarDate } from "#lib/working-days.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { deliveryZoneRepository } from "./delivery-zone.repository.js";
import type {
  CreateDeliveryZoneBody,
  ListDeliveryZoneHistoryQuery,
  UpdateDeliveryZoneBody,
} from "./delivery-zone.schemas.js";
import type {
  DeliveryEstimate,
  DeliveryZoneCityMatch,
  DeliveryZoneFeeValues,
  DeliveryZoneHistoryView,
  DeliveryZoneRecord,
  DeliveryZoneSnapshot,
  DeliveryZoneView,
} from "./delivery-zone.types.js";
import { toFeeValues, toSnapshot, toView } from "./delivery-zone.utils.js";

const NO_ZONES = 0;

const requireZone = async (id: string): Promise<DeliveryZoneRecord> => {
  const zone = await deliveryZoneRepository.findById(id);
  if (!zone)
    throw new AppError("ZONE_NOT_FOUND", "Delivery zone not found.", HTTP_STATUS.NOT_FOUND);
  return zone;
};

const requireDefaultZone = async (countryCode: string): Promise<DeliveryZoneRecord> => {
  const zone = await deliveryZoneRepository.findDefault(countryCode);
  if (!zone) {
    throw new AppError(
      "NO_DEFAULT_ZONE",
      "No default delivery zone is configured.",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
  return zone;
};

const findZoneForCity = async (
  city: string,
  countryCode: string,
): Promise<DeliveryZoneRecord | null> =>
  deliveryZoneRepository.findByCityNormalized(countryCode, normalizeCityName(city));

const resolveZoneForCity = async (
  city: string | null,
  countryCode: string,
): Promise<DeliveryZoneRecord> =>
  (city ? await findZoneForCity(city, countryCode) : null) ??
  (await requireDefaultZone(countryCode));

const withCityConflictHandling = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "CITY_ALREADY_ASSIGNED",
        "One of these cities already belongs to another zone.",
        HTTP_STATUS.CONFLICT,
      );
    }
    throw error;
  }
};

export const deliveryZoneService = {
  async listPublic(): Promise<DeliveryZoneView[]> {
    const zones = await deliveryZoneRepository.listAll();
    return zones.map(toView);
  },

  async searchCities(
    query: string,
    limit: number,
    countryCode: string = PLATFORM_DEFAULT_COUNTRY_CODE,
  ): Promise<DeliveryZoneCityMatch[]> {
    const matches = await deliveryZoneRepository.searchCities(query, limit, countryCode);
    return matches.map((match) => ({
      city: match.city,
      zoneId: match.zone.id,
      zoneName: match.zone.name,
      isDefault: match.zone.isDefault,
      ...toFeeValues(match.zone),
    }));
  },

  findZoneForCity,

  async resolveZoneIdForCity(
    city: string | null,
    countryCode: string = PLATFORM_DEFAULT_COUNTRY_CODE,
  ): Promise<string> {
    return (await resolveZoneForCity(city, countryCode)).id;
  },

  async resolveFeeValuesForCity(
    city: string | null,
    countryCode: string = PLATFORM_DEFAULT_COUNTRY_CODE,
  ): Promise<DeliveryZoneFeeValues> {
    return toFeeValues(await resolveZoneForCity(city, countryCode));
  },

  async estimateDeliveryWindow(
    city: string | null,
    placedAt: Date,
    countryCode: string = PLATFORM_DEFAULT_COUNTRY_CODE,
  ): Promise<DeliveryEstimate | null> {
    const { minDeliveryDays, maxDeliveryDays } = await resolveZoneForCity(city, countryCode);
    const calendar = COUNTRY_SETTINGS[countryCode];
    if (minDeliveryDays === null || maxDeliveryDays === null || !calendar) return null;

    return {
      earliestDate: addWorkingDaysAsCalendarDate(placedAt, minDeliveryDays, calendar),
      latestDate: addWorkingDaysAsCalendarDate(placedAt, maxDeliveryDays, calendar),
    };
  },

  async createZone(input: CreateDeliveryZoneBody): Promise<DeliveryZoneView> {
    return withCityConflictHandling(async () => {
      const isFirstZoneInCountry =
        (await deliveryZoneRepository.countForCountry(input.countryCode)) === NO_ZONES;
      const zone = await deliveryZoneRepository.create(prisma, {
        ...input,
        isDefault: isFirstZoneInCountry,
      });
      return toView(zone);
    });
  },

  async updateZone(
    id: string,
    adminUserId: string,
    input: UpdateDeliveryZoneBody,
  ): Promise<DeliveryZoneView> {
    return withCityConflictHandling(async () => {
      const current = await requireZone(id);

      const updated = await prisma.$transaction(async (tx) => {
        const zone = await deliveryZoneRepository.update(tx, id, input);
        await deliveryZoneRepository.recordHistory(tx, {
          zoneId: id,
          changedById: adminUserId,
          oldValues: toSnapshot(current),
          newValues: toSnapshot(zone),
        });
        return zone;
      });

      return toView(updated);
    });
  },

  async setDefaultZone(zoneId: string, adminUserId: string): Promise<DeliveryZoneView> {
    const target = await requireZone(zoneId);
    if (target.isDefault) return toView(target);

    const previousDefault = await deliveryZoneRepository.findDefault(target.countryCode);

    const updated = await prisma.$transaction(async (tx) => {
      await deliveryZoneRepository.setDefault(tx, zoneId, target.countryCode);

      if (previousDefault) {
        const previousSnapshot = toSnapshot(previousDefault);
        await deliveryZoneRepository.recordHistory(tx, {
          zoneId: previousDefault.id,
          changedById: adminUserId,
          oldValues: previousSnapshot,
          newValues: { ...previousSnapshot, isDefault: false } satisfies DeliveryZoneSnapshot,
        });
      }

      const zone = await deliveryZoneRepository.findById(zoneId, tx);
      if (!zone) {
        throw new AppError("ZONE_NOT_FOUND", "Delivery zone not found.", HTTP_STATUS.NOT_FOUND);
      }

      await deliveryZoneRepository.recordHistory(tx, {
        zoneId: zone.id,
        changedById: adminUserId,
        oldValues: toSnapshot(target),
        newValues: toSnapshot(zone),
      });

      return zone;
    });

    return toView(updated);
  },

  async deleteZone(id: string): Promise<void> {
    const zone = await requireZone(id);
    if (zone.isDefault) {
      throw new AppError(
        "DEFAULT_ZONE_UNDELETABLE",
        "The default zone can't be deleted. Set another zone as default first.",
        HTTP_STATUS.CONFLICT,
      );
    }
    await deliveryZoneRepository.delete(id);
  },

  async listHistory(
    query: ListDeliveryZoneHistoryQuery,
  ): Promise<{ items: DeliveryZoneHistoryView[]; nextCursor: string | null }> {
    const rows = await deliveryZoneRepository.listHistory(query);
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    return {
      items: pagedRows.map((row) => ({
        id: row.id,
        zoneName: row.zone.name,
        changedByName: row.changedBy.name,
        oldValues: row.oldValues as DeliveryZoneSnapshot,
        newValues: row.newValues as DeliveryZoneSnapshot,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor,
    };
  },
};
