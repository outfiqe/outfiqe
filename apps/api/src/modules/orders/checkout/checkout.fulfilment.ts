import { PICKUP_CODE_LENGTH } from "@outfiqe/utils";

import {
  PLATFORM_DEFAULT_COUNTRY_CODE,
  PLATFORM_DEFAULT_COUNTRY_SETTINGS,
} from "#constants/country.constants.js";
import { FulfilmentMode, PickupStatus } from "#generated/prisma/enums.js";
import { toE164PhoneNumber } from "#lib/phone.utils.js";
import { generateRandomCode } from "#lib/random-code.utils.js";
import { calendarDateToUtcMidnight } from "#lib/working-days.utils.js";
import { deliveryZoneService } from "#modules/delivery-zones/delivery-zone.service.js";
import { logisticsService } from "#modules/logistics/logistics.service.js";

import type { FulfilmentGroupSpec } from "../order.types.js";

type CheckoutFulfilmentInput = {
  brandIds: string[];
  city: string;
  phone: string;
  orderPlacedAt: Date;
  requiresCashOnDelivery: boolean;
};

export type CheckoutFulfilmentPlan = {
  countryCode: string;
  currency: string;
  phoneE164: string | null;
  promisedDeliveryFrom: Date | null;
  promisedDeliveryBy: Date | null;
  fulfilmentGroupSpecs: FulfilmentGroupSpec[];
};

export const planCheckoutFulfilment = async ({
  brandIds,
  city,
  phone,
  orderPlacedAt,
  requiresCashOnDelivery,
}: CheckoutFulfilmentInput): Promise<CheckoutFulfilmentPlan> => {
  const countryCode = PLATFORM_DEFAULT_COUNTRY_CODE;
  const [assignments, deliveryEstimate] = await Promise.all([
    logisticsService.resolveFulfilmentAssignments({
      brandIds,
      deliveryCity: city,
      countryCode,
      requiresCashOnDelivery,
    }),
    deliveryZoneService.estimateDeliveryWindow(city, orderPlacedAt, countryCode),
  ]);

  return {
    countryCode,
    currency: PLATFORM_DEFAULT_COUNTRY_SETTINGS.currency,
    phoneE164: toE164PhoneNumber(phone, countryCode),
    promisedDeliveryFrom: deliveryEstimate
      ? calendarDateToUtcMidnight(deliveryEstimate.earliestDate)
      : null,
    promisedDeliveryBy: deliveryEstimate
      ? calendarDateToUtcMidnight(deliveryEstimate.latestDate)
      : null,
    fulfilmentGroupSpecs: assignments.map((assignment) => {
      const isHubFlow = assignment.fulfilmentMode === FulfilmentMode.OUTFIQE_LOGISTICS;
      return {
        ...assignment,
        pickupStatus: isHubFlow ? PickupStatus.AWAITING_BRAND : null,
        pickupStatusChangedAt: isHubFlow ? orderPlacedAt : null,
        pickupCode: isHubFlow ? generateRandomCode(PICKUP_CODE_LENGTH) : null,
      };
    }),
  };
};
