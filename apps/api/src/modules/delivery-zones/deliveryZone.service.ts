import { prisma } from "#db/prisma.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { deliveryZoneRepository } from "./deliveryZone.repository.js";
import type {
  CreateDeliveryZoneBody,
  ListDeliveryZoneHistoryQuery,
  UpdateDeliveryZoneBody,
} from "./deliveryZone.schemas.js";
import type {
  DeliveryZoneCityMatch,
  DeliveryZoneFeeValues,
  DeliveryZoneHistoryView,
  DeliveryZoneRecord,
  DeliveryZoneSnapshot,
  DeliveryZoneView,
} from "./deliveryZone.types.js";
import { normalizeCityName, toFeeValues, toSnapshot, toView } from "./deliveryZone.utils.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const SERVER_ERROR_STATUS = 500;

const requireZone = async (id: string): Promise<DeliveryZoneRecord> => {
  const zone = await deliveryZoneRepository.findById(id);
  if (!zone) throw new AppError("ZONE_NOT_FOUND", "Delivery zone not found.", NOT_FOUND_STATUS);
  return zone;
};

const requireDefaultZone = async (): Promise<DeliveryZoneRecord> => {
  const zone = await deliveryZoneRepository.findDefault();
  if (!zone) {
    throw new AppError(
      "NO_DEFAULT_ZONE",
      "No default delivery zone is configured.",
      SERVER_ERROR_STATUS,
    );
  }
  return zone;
};

const withCityConflictHandling = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "CITY_ALREADY_ASSIGNED",
        "One of these cities already belongs to another zone.",
        CONFLICT_STATUS,
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

  async searchCities(query: string, limit: number): Promise<DeliveryZoneCityMatch[]> {
    const matches = await deliveryZoneRepository.searchCities(query, limit);
    return matches.map((match) => ({
      city: match.city,
      zoneId: match.zone.id,
      zoneName: match.zone.name,
      isDefault: match.zone.isDefault,
      ...toFeeValues(match.zone),
    }));
  },

  async resolveFeeValuesForCity(city: string | null): Promise<DeliveryZoneFeeValues> {
    const zone = city
      ? ((await deliveryZoneRepository.findByCityNormalized(normalizeCityName(city))) ??
        (await requireDefaultZone()))
      : await requireDefaultZone();
    return toFeeValues(zone);
  },

  async createZone(input: CreateDeliveryZoneBody): Promise<DeliveryZoneView> {
    return withCityConflictHandling(async () => {
      const isFirstZone = (await deliveryZoneRepository.countAll()) === 0;
      const zone = await deliveryZoneRepository.create(prisma, {
        ...input,
        isDefault: isFirstZone,
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

    const previousDefault = await deliveryZoneRepository.findDefault();

    const updated = await prisma.$transaction(async (tx) => {
      await deliveryZoneRepository.setDefault(tx, zoneId);

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
        throw new AppError("ZONE_NOT_FOUND", "Delivery zone not found.", NOT_FOUND_STATUS);
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
        CONFLICT_STATUS,
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
