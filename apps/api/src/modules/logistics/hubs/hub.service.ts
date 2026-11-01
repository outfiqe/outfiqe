import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { toE164PhoneNumber } from "#lib/phone.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { logisticsErrors } from "../logistics.errors.js";
import { logisticsHubRepository } from "./hub.repository.js";
import type { HubBody, SetHubPickupZonesBody } from "./hub.schemas.js";
import type { HubView } from "./hub.types.js";
import { toHubView } from "./hub.utils.js";

const requireHub = async (hubId: string) => {
  const hub = await logisticsHubRepository.findHubById(hubId);
  if (!hub) throw logisticsErrors.hubNotFound();
  return hub;
};

const toHubWriteFields = ({ phone, ...hub }: HubBody) => {
  const phoneE164 = toE164PhoneNumber(phone, hub.countryCode);
  if (!phoneE164) {
    throw new AppError(
      "INVALID_PHONE",
      "That phone number isn't valid for the hub's country.",
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return { ...hub, phoneE164 };
};

export const logisticsHubService = {
  async listHubs(): Promise<HubView[]> {
    const hubs = await logisticsHubRepository.listHubs();
    return hubs.map(toHubView);
  },

  async createHub(body: HubBody): Promise<HubView> {
    return toHubView(await logisticsHubRepository.createHub(toHubWriteFields(body)));
  },

  async updateHub(hubId: string, body: HubBody): Promise<HubView> {
    const currentHub = await requireHub(hubId);
    const isMovingCountryWithZones =
      body.countryCode !== currentHub.countryCode && currentHub.pickupZones.length > 0;
    if (isMovingCountryWithZones) {
      throw new AppError(
        "HUB_HAS_PICKUP_ZONES",
        "Remove the hub's pickup areas before moving it to another country.",
        HTTP_STATUS.CONFLICT,
      );
    }
    return toHubView(await logisticsHubRepository.updateHub(hubId, toHubWriteFields(body)));
  },

  async setHubPickupZones(hubId: string, { deliveryZoneIds }: SetHubPickupZonesBody) {
    const hub = await requireHub(hubId);
    const matchingZoneCount = await logisticsHubRepository.countZonesInCountry(
      deliveryZoneIds,
      hub.countryCode,
    );
    if (matchingZoneCount !== deliveryZoneIds.length) {
      throw new AppError(
        "PICKUP_ZONE_NOT_IN_HUB_COUNTRY",
        "Every pickup area must be a delivery zone in the hub's country.",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      );
    }

    const updatedHub = await prisma.$transaction(async (tx) => {
      await logisticsHubRepository.replaceHubPickupZones(tx, hubId, deliveryZoneIds);
      return logisticsHubRepository.findHubById(hubId, tx);
    });
    return toHubView(updatedHub ?? hub);
  },
};
