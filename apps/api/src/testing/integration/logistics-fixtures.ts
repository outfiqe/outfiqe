import { randomUUID } from "node:crypto";

import { BAG_TAG_CODE_LENGTH, PICKUP_CODE_LENGTH } from "@outfiqe/utils";

import { prisma } from "#db/prisma.js";
import {
  FeatureFlagRollout,
  FulfilmentMode,
  FulfilmentStatus,
  PartnerWebhookVerification,
  PickupStatus,
  RiderEmploymentType,
  RiderStatus,
  ShipmentStatus,
  TrackingEventCode,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { generateRandomCode } from "#lib/random-code.utils.js";
import { ORDER_LOGISTICS_FLAG } from "#modules/feature-flags/feature-flags.registry.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";
import { HTTP_JSON_ADAPTER_KEY } from "#modules/logistics/partners/adapters/http-json.adapter.js";
import { MANUAL_ADAPTER_KEY } from "#modules/logistics/partners/adapters/manual.adapter.js";

import { createBuyer, createOrder, createPurchasableProduct } from "./order-fixtures.js";
import { uniquePhone } from "./unique-values.js";

const KATHMANDU_TIME_ZONE = "Asia/Kathmandu";
const SUNDAY_TO_FRIDAY = [0, 1, 2, 3, 4, 5];
const DEFAULT_PARCEL_WEIGHT_GRAMS = 1200;
const SINGLE_PACKAGE = 1;
const NOTHING_TO_COLLECT = 0;
const DEFAULT_PRODUCT_PRICE = 1000;
const ONE_BRAND = 1;
const NO_BRANDS = 0;
const READY_CUTOFF_MINUTES = 60;
const VALLEY_DELIVERY_FEE = 100;
const VALLEY_FREE_DELIVERY_THRESHOLD = 5000;
const NO_COD_HANDLING_FEE = 0;
const VALLEY_MIN_DELIVERY_DAYS = 1;
const VALLEY_MAX_DELIVERY_DAYS = 2;

export type PartnerApiConnection = {
  credentialsKey: string;
  webhookVerification: PartnerWebhookVerification;
};

const DEFAULT_PARTNER_STATUS_MAP = [
  { rawStatus: "PICKED UP", canonicalCode: TrackingEventCode.HANDED_TO_PARTNER },
  { rawStatus: "IN TRANSIT", canonicalCode: TrackingEventCode.IN_TRANSIT },
  { rawStatus: "OUT FOR DELIVERY", canonicalCode: TrackingEventCode.OUT_FOR_DELIVERY },
  { rawStatus: "DELIVERED", canonicalCode: TrackingEventCode.DELIVERED },
  { rawStatus: "RETURNED", canonicalCode: TrackingEventCode.RETURNED_TO_HUB },
];

export const createHub = () =>
  prisma.hub.create({
    data: {
      name: `Test Hub ${randomUUID().slice(0, 6)}`,
      countryCode: "NP",
      address: "Teku, Kathmandu",
      city: "Kathmandu",
      phoneE164: "+9779800000001",
      timeZone: KATHMANDU_TIME_ZONE,
      workingDays: SUNDAY_TO_FRIDAY,
      openTime: "09:00",
      closeTime: "19:00",
      pickupRoundTimes: ["11:00", "15:00"],
      readyCutoffMinutes: READY_CUTOFF_MINUTES,
      partnerCollectionTime: "17:30",
    },
  });

type HubOrderOptions = {
  hubBrandCount?: number;
  brandShippedBrandCount?: number;
};

export const createHubOrder = async ({
  hubBrandCount = ONE_BRAND,
  brandShippedBrandCount = NO_BRANDS,
}: HubOrderOptions = {}) => {
  const buyer = await createBuyer();
  const hub = await createHub();
  const order = await createOrder(buyer.id);

  const hubGroupIds = await Promise.all(
    Array.from({ length: hubBrandCount }, async () => {
      const { brand } = await createPurchasableProduct(DEFAULT_PRODUCT_PRICE);
      const group = await prisma.orderFulfilmentGroup.create({
        data: {
          orderId: order.id,
          brandId: brand.id,
          fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
          pickupStatus: PickupStatus.AWAITING_BRAND,
          pickupCode: generateRandomCode(PICKUP_CODE_LENGTH),
          hubId: hub.id,
        },
      });
      return group.id;
    }),
  );

  const brandShippedGroupIds = await Promise.all(
    Array.from({ length: brandShippedBrandCount }, async () => {
      const { brand } = await createPurchasableProduct(DEFAULT_PRODUCT_PRICE);
      const group = await prisma.orderFulfilmentGroup.create({
        data: { orderId: order.id, brandId: brand.id },
      });
      return group.id;
    }),
  );

  return { buyer, hub, order, hubGroupIds, brandShippedGroupIds };
};

export const packGroupsIntoParcel = async (
  orderId: string,
  hubId: string,
  fulfilmentGroupIds: string[],
) => {
  const shipment = await prisma.shipment.create({
    data: {
      orderId,
      hubId,
      trackingCode: `OFQ-${generateRandomCode(PICKUP_CODE_LENGTH)}`,
      status: ShipmentStatus.PACKED,
      currency: "NPR",
      codAmountToCollect: NOTHING_TO_COLLECT,
      weightGrams: DEFAULT_PARCEL_WEIGHT_GRAMS,
      parcelCount: SINGLE_PACKAGE,
    },
  });
  await prisma.orderFulfilmentGroup.updateMany({
    where: { id: { in: fulfilmentGroupIds } },
    data: {
      pickupStatus: PickupStatus.IN_PARCEL,
      shipmentId: shipment.id,
      status: FulfilmentStatus.PACKED,
    },
  });
  return shipment;
};

export const enableOrderLogisticsForBrands = async (brandIds: string[]) => {
  await prisma.featureFlag.upsert({
    where: { key: ORDER_LOGISTICS_FLAG },
    create: {
      key: ORDER_LOGISTICS_FLAG,
      rollout: FeatureFlagRollout.ALLOW_LIST,
      allowedBrandIds: brandIds,
    },
    update: { rollout: FeatureFlagRollout.ALLOW_LIST, allowedBrandIds: brandIds },
  });
  featureFlagsService.invalidate(ORDER_LOGISTICS_FLAG);
};

export const createCoveredPickupArea = async (cities: string[]) => {
  const hub = await createHub();
  const zone = await prisma.deliveryZone.create({
    data: {
      name: `Valley ${randomUUID().slice(0, 6)}`,
      standardDeliveryFee: VALLEY_DELIVERY_FEE,
      freeDeliveryThreshold: VALLEY_FREE_DELIVERY_THRESHOLD,
      codHandlingFee: NO_COD_HANDLING_FEE,
      minDeliveryDays: VALLEY_MIN_DELIVERY_DAYS,
      maxDeliveryDays: VALLEY_MAX_DELIVERY_DAYS,
      cities: {
        create: cities.map((city) => ({ city, cityNormalized: city.trim().toLowerCase() })),
      },
    },
  });
  await prisma.hubPickupZone.create({ data: { hubId: hub.id, deliveryZoneId: zone.id } });
  return { hub, zone };
};

export const createDefaultPickupLocation = (brandId: string, city: string) =>
  prisma.brandPickupLocation.create({
    data: {
      brandId,
      label: "Studio",
      contactName: "Studio Manager",
      contactPhoneE164: "+9779812345678",
      address: "Jhamsikhel Road",
      city,
      cityNormalized: city.trim().toLowerCase(),
      countryCode: "NP",
      isDefault: true,
    },
  });

export const requireFixtureId = (id: string | undefined): string => {
  if (!id) throw new Error("The fixture did not create the record this test expects.");
  return id;
};

type RiderSessionOptions = {
  hubId: string;
  status?: RiderStatus;
  employmentType?: RiderEmploymentType;
};

export const createRiderSession = async ({
  hubId,
  status = RiderStatus.ACTIVE,
  employmentType = RiderEmploymentType.CONTRACTOR,
}: RiderSessionOptions) => {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      email: `rider-${suffix}@outfiqe.test`,
      name: "Test Rider",
      handle: `test-rider-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.RIDER,
      emailVerified: true,
    },
  });
  const rider = await prisma.rider.create({
    data: { userId: user.id, hubId, employmentType, status },
  });
  const { accessToken } = generateTokenpair({ sub: user.id, role: UserRole.RIDER });
  return { userId: user.id, riderId: rider.id, authHeader: `Bearer ${accessToken}` };
};

export const createBagTag = async (hubId: string, createdById: string) => {
  const batch = await prisma.bagTagBatch.create({
    data: { hubId, tagCount: SINGLE_PACKAGE, createdById },
  });
  return prisma.bagTag.create({
    data: { batchId: batch.id, code: generateRandomCode(BAG_TAG_CODE_LENGTH) },
  });
};

export const createReadyPickupsAtLocation = async (hubId: string, pickupCount: number) => {
  const buyer = await createBuyer();
  const { brand } = await createPurchasableProduct(DEFAULT_PRODUCT_PRICE);
  const pickupLocation = await createDefaultPickupLocation(brand.id, "Lalitpur");
  const readyAt = new Date();
  const groups = await Promise.all(
    Array.from({ length: pickupCount }, async () => {
      const order = await createOrder(buyer.id);
      return prisma.orderFulfilmentGroup.create({
        data: {
          orderId: order.id,
          brandId: brand.id,
          fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
          pickupStatus: PickupStatus.READY_FOR_PICKUP,
          pickupStatusChangedAt: readyAt,
          readyForPickupAt: readyAt,
          status: FulfilmentStatus.PACKED,
          pickupCode: generateRandomCode(PICKUP_CODE_LENGTH),
          hubId,
          pickupLocationId: pickupLocation.id,
        },
      });
    }),
  );
  return { brand, pickupLocation, groups };
};

export const createPickupForBrand = async (
  brandId: string,
  fulfilmentMode: FulfilmentMode = FulfilmentMode.OUTFIQE_LOGISTICS,
) => {
  const buyer = await createBuyer();
  const hub = await createHub();
  const order = await createOrder(buyer.id);
  const isHubFlow = fulfilmentMode === FulfilmentMode.OUTFIQE_LOGISTICS;
  const group = await prisma.orderFulfilmentGroup.create({
    data: {
      orderId: order.id,
      brandId,
      fulfilmentMode,
      pickupStatus: isHubFlow ? PickupStatus.AWAITING_BRAND : null,
      pickupCode: isHubFlow ? generateRandomCode(PICKUP_CODE_LENGTH) : null,
      hubId: isHubFlow ? hub.id : null,
    },
  });
  return { buyer, hub, order, group };
};

export const createDeliveryPartnerCovering = async ({
  hubId,
  deliveryZoneIds,
  supportsCod = true,
  referencePattern = null,
  apiConnection = null,
}: {
  hubId: string;
  deliveryZoneIds: string[];
  supportsCod?: boolean;
  referencePattern?: string | null;
  apiConnection?: PartnerApiConnection | null;
}) => {
  const suffix = randomUUID().slice(0, 8);
  const isApiPartner = apiConnection !== null;
  return prisma.deliveryPartner.create({
    data: {
      code: `partner-${suffix}`,
      name: `Courier ${suffix}`,
      countryCode: "NP",
      adapterKey: isApiPartner ? HTTP_JSON_ADAPTER_KEY : MANUAL_ADAPTER_KEY,
      supportsBooking: isApiPartner,
      supportsWebhooks: isApiPartner,
      supportsPolling: isApiPartner,
      webhookVerification: apiConnection?.webhookVerification ?? PartnerWebhookVerification.NONE,
      supportsCod,
      referencePattern,
      accounts: {
        create: {
          hubId,
          merchantAccountRef: `OUTFIQE-${suffix}`,
          credentialsKey: apiConnection?.credentialsKey ?? null,
        },
      },
      zones: {
        create: deliveryZoneIds.map((deliveryZoneId) => ({ hubId, deliveryZoneId, priority: 0 })),
      },
      statusMappings: { create: DEFAULT_PARTNER_STATUS_MAP },
    },
    include: { accounts: true },
  });
};
