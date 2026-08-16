import { prisma } from "#db/prisma.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { orderFeeSettingsRepository } from "./orderFeeSettings.repository.js";
import type {
  ListOrderFeeSettingsHistoryQuery,
  UpdateOrderFeeSettingsBody,
} from "./orderFeeSettings.schemas.js";
import type {
  OrderFeeSettingsHistoryView,
  OrderFeeSettingsRecord,
  OrderFeeSettingsView,
  OrderFeeValues,
} from "./orderFeeSettings.types.js";

const NOT_FOUND_STATUS = 404;

const toValues = (record: OrderFeeSettingsRecord): OrderFeeValues => ({
  standardDeliveryFee: record.standardDeliveryFee,
  freeDeliveryThreshold: record.freeDeliveryThreshold,
  codHandlingFee: record.codHandlingFee,
});

const toView = (record: OrderFeeSettingsRecord): OrderFeeSettingsView => ({
  ...toValues(record),
  updatedAt: record.updatedAt.toISOString(),
});

const requireSettings = async (): Promise<OrderFeeSettingsRecord> => {
  const settings = await orderFeeSettingsRepository.find();
  if (!settings) {
    throw new AppError(
      "SETTINGS_NOT_FOUND",
      "Order fee settings are not configured.",
      NOT_FOUND_STATUS,
    );
  }
  return settings;
};

export const orderFeeSettingsService = {
  async getSettings(): Promise<OrderFeeSettingsView> {
    return toView(await requireSettings());
  },

  async getFeeValues(): Promise<OrderFeeValues> {
    return toValues(await requireSettings());
  },

  async updateSettings(
    adminUserId: string,
    input: UpdateOrderFeeSettingsBody,
  ): Promise<OrderFeeSettingsView> {
    const current = await requireSettings();
    const oldValues = toValues(current);
    const newValues: OrderFeeValues = { ...oldValues, ...input };

    const updated = await prisma.$transaction(async (tx) => {
      const record = await orderFeeSettingsRepository.update(tx, current.id, input);
      await orderFeeSettingsRepository.recordHistory(tx, {
        settingsId: current.id,
        changedById: adminUserId,
        oldValues,
        newValues,
      });
      return record;
    });

    return toView(updated);
  },

  async listHistory(
    query: ListOrderFeeSettingsHistoryQuery,
  ): Promise<{ items: OrderFeeSettingsHistoryView[]; nextCursor: string | null }> {
    const rows = await orderFeeSettingsRepository.listHistory(query);
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    return {
      items: pagedRows.map((row) => ({
        id: row.id,
        changedByName: row.changedBy.name,
        oldValues: row.oldValues as OrderFeeValues,
        newValues: row.newValues as OrderFeeValues,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor,
    };
  },
};
