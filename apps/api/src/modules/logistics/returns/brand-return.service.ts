import { subHours } from "date-fns/subHours";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  BrandReturnSource,
  InventoryMovementKind,
  InventoryMovementSource,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { productService } from "#modules/products/product.service.js";
import { describeError } from "#redis/redis.utils.js";

import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import type { RecordTrackingEventOutcome } from "../tracking/tracking.types.js";
import {
  type BrandReturnToConfirmRecord,
  type BrandReturnViewRecord,
  logisticsBrandReturnRepository,
} from "./brand-return.repository.js";
import type { ListBrandReturnsQuery } from "./brand-return.schemas.js";
import type { BrandReturnView } from "./brand-return.types.js";

const AUTO_CONFIRM_AFTER_HOURS = 48;
const AUTO_CONFIRM_BATCH_SIZE = 100;
const NO_UNITS = 0;
const RETURNED_TO_BRAND_DEDUPE_PREFIX = "returned-to-brand";

type TransactionClient = Prisma.TransactionClient;

const brandReturnNotFoundError = () =>
  new AppError("BRAND_RETURN_NOT_FOUND", "Return not found.", HTTP_STATUS.NOT_FOUND);

const toBrandReturnView = ({
  fulfilmentGroup,
  lines,
  createdAt,
  droppedOffAt,
  confirmedAt,
  ...brandReturn
}: BrandReturnViewRecord): BrandReturnView => ({
  ...brandReturn,
  orderId: fulfilmentGroup.orderId,
  createdAt: createdAt.toISOString(),
  droppedOffAt: droppedOffAt?.toISOString() ?? null,
  confirmedAt: confirmedAt?.toISOString() ?? null,
  lines: lines.map(({ resellableQty, damagedQty, orderItem }) => ({
    productName: orderItem.product.name,
    sizeLabel: orderItem.size.label,
    resellableQty,
    damagedQty,
  })),
});

const requireBrandReturnView = async (brandReturnId: string): Promise<BrandReturnView> => {
  const brandReturn = await logisticsBrandReturnRepository.findView(brandReturnId);
  if (!brandReturn) throw brandReturnNotFoundError();
  return toBrandReturnView(brandReturn);
};

const confirmInTransaction = async (
  tx: TransactionClient,
  brandReturn: BrandReturnToConfirmRecord,
  confirmation: { confirmedById: string | null; isAutoConfirmed: boolean },
): Promise<RecordTrackingEventOutcome | null> => {
  const confirmedAt = new Date();
  const isConfirmed = await logisticsBrandReturnRepository.markConfirmed(tx, {
    brandReturnId: brandReturn.id,
    confirmedAt,
    ...confirmation,
  });
  if (!isConfirmed) {
    throw new AppError(
      "BRAND_RETURN_NOT_DROPPED_OFF",
      "You can confirm a return once our rider has handed it to you.",
      HTTP_STATUS.CONFLICT,
    );
  }
  const resellableLines = brandReturn.lines
    .filter(({ resellableQty }) => resellableQty > NO_UNITS)
    .map(({ resellableQty, orderItem }) => ({ sizeId: orderItem.sizeId, qty: resellableQty }));
  await productService.restoreStockForItems(tx, resellableLines, {
    kind: InventoryMovementKind.ORDER_RESTORE,
    sourceType: InventoryMovementSource.BRAND_RETURN,
    sourceId: brandReturn.id,
  });
  if (brandReturn.source !== BrandReturnSource.PARCEL_RETURNED) return null;
  return logisticsTrackingService.recordEventInTransaction(tx, {
    subject: {
      kind: TRACKING_SUBJECT_KIND.PICKUP,
      fulfilmentGroupId: brandReturn.fulfilmentGroupId,
    },
    code: TrackingEventCode.RETURNED_TO_BRAND,
    source: confirmation.isAutoConfirmed ? TrackingEventSource.SYSTEM : TrackingEventSource.BRAND,
    ...(confirmation.confirmedById ? { actorUserId: confirmation.confirmedById } : {}),
    dedupeKey: `${RETURNED_TO_BRAND_DEDUPE_PREFIX}:${brandReturn.id}`,
    occurredAt: confirmedAt,
    ...(confirmation.isAutoConfirmed
      ? { note: "Confirmed automatically 48 hours after the rider handed it over" }
      : {}),
  });
};

const confirmBrandReturn = async (
  brandReturn: BrandReturnToConfirmRecord,
  confirmation: { confirmedById: string | null; isAutoConfirmed: boolean },
) => {
  const pickupOutcome = await prisma.$transaction((tx) =>
    confirmInTransaction(tx, brandReturn, confirmation),
  );
  if (pickupOutcome) await logisticsTrackingService.announceStageChange(pickupOutcome);
};

export const logisticsBrandReturnService = {
  async listMyBrandReturns(
    userId: string,
    { status, cursor, limit }: ListBrandReturnsQuery,
  ): Promise<{ items: BrandReturnView[]; nextCursor: string | null }> {
    const brandId = await requireBrandId(userId);
    const brandReturns = await logisticsBrandReturnRepository.listForBrand({
      brandId,
      ...(status ? { status } : {}),
      ...(cursor ? { cursor } : {}),
      limit,
    });
    const { items, nextCursor } = buildCursorPage(brandReturns, limit, ({ id }) => id);
    return { items: items.map(toBrandReturnView), nextCursor };
  },

  async confirmMyBrandReturn(userId: string, brandReturnId: string): Promise<BrandReturnView> {
    const brandId = await requireBrandId(userId);
    const brandReturn = await logisticsBrandReturnRepository.findToConfirm(prisma, brandReturnId);
    if (brandReturn?.brandId !== brandId) throw brandReturnNotFoundError();
    await confirmBrandReturn(brandReturn, { confirmedById: userId, isAutoConfirmed: false });
    return requireBrandReturnView(brandReturnId);
  },

  async confirmOverdueBrandReturns(): Promise<void> {
    const overdueIds = await logisticsBrandReturnRepository.listOverdueDropOffIds({
      droppedOffBefore: subHours(new Date(), AUTO_CONFIRM_AFTER_HOURS),
      limit: AUTO_CONFIRM_BATCH_SIZE,
    });
    for (const brandReturnId of overdueIds) {
      try {
        const brandReturn = await logisticsBrandReturnRepository.findToConfirm(
          prisma,
          brandReturnId,
        );
        if (brandReturn) {
          await confirmBrandReturn(brandReturn, { confirmedById: null, isAutoConfirmed: true });
        }
      } catch (error) {
        logger.error(`Couldn't confirm brand return ${brandReturnId}: ${describeError(error)}`);
      }
    }
  },
};
