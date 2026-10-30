import { HTTP_STATUS } from "#constants/http.constants.js";
import { PickupStatus, TrackingEventCode, TrackingEventSource } from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { logisticsErrors } from "../logistics.errors.js";
import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import { logisticsPickupRepository } from "./pickup.repository.js";
import type { BrandPickupView } from "./pickup.types.js";

const READY_FOR_PICKUP_DEDUPE_PREFIX = "ready-for-pickup";

const requireBrandHubPickup = async (fulfilmentGroupId: string, brandId: string) => {
  const pickup = await logisticsPickupRepository.findBrandHubPickup(fulfilmentGroupId, brandId);
  if (!pickup?.pickupStatus || !pickup.pickupCode) {
    throw logisticsErrors.pickupNotFound();
  }
  return { ...pickup, pickupStatus: pickup.pickupStatus, pickupCode: pickup.pickupCode };
};

const toBrandPickupView = (pickup: Awaited<ReturnType<typeof requireBrandHubPickup>>) => ({
  fulfilmentGroupId: pickup.id,
  pickupStatus: pickup.pickupStatus,
  pickupCode: pickup.pickupCode,
  readyForPickupAt: pickup.readyForPickupAt?.toISOString() ?? null,
});

export const logisticsPickupService = {
  async markReadyForPickup(userId: string, fulfilmentGroupId: string): Promise<BrandPickupView> {
    const brandId = await requireBrandId(userId);
    const pickup = await requireBrandHubPickup(fulfilmentGroupId, brandId);
    if (pickup.pickupStatus === PickupStatus.READY_FOR_PICKUP) return toBrandPickupView(pickup);
    if (pickup.pickupStatus !== PickupStatus.AWAITING_BRAND) {
      throw new AppError(
        "PICKUP_ALREADY_MOVED_ON",
        "This order has already left your hands.",
        HTTP_STATUS.CONFLICT,
      );
    }

    await logisticsTrackingService.recordEvent({
      subject: { kind: TRACKING_SUBJECT_KIND.PICKUP, fulfilmentGroupId },
      code: TrackingEventCode.READY_FOR_PICKUP,
      source: TrackingEventSource.BRAND,
      actorUserId: userId,
      dedupeKey: `${READY_FOR_PICKUP_DEDUPE_PREFIX}:${fulfilmentGroupId}`,
      occurredAt: new Date(),
    });
    return toBrandPickupView(await requireBrandHubPickup(fulfilmentGroupId, brandId));
  },
};
