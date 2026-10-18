import { HTTP_STATUS } from "#constants/http.constants.js";
import { DeliveryPartnerConnection } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { deliveryZoneService } from "#modules/delivery-zones/delivery-zone.service.js";

import { partnerAdapterRegistry } from "../partners/adapters/partner-adapter.registry.js";
import { logisticsShipmentBookingRepository } from "../shipments/shipment-booking.repository.js";

export type ParcelPartnerChoice = {
  partnerId: string;
  partnerName: string;
  partnerAccountId: string;
  connection: DeliveryPartnerConnection;
};

type ParcelPartnerRequest = {
  hubId: string;
  city: string;
  countryCode: string;
  requiresCod: boolean;
  requestedPartnerId: string | null;
};

const connectionFor = (adapterKey: string): DeliveryPartnerConnection =>
  partnerAdapterRegistry.describeCapabilities(adapterKey).supportsBooking
    ? DeliveryPartnerConnection.API
    : DeliveryPartnerConnection.MANUAL;

export const logisticsParcelPartner = {
  async listEligiblePartners({
    hubId,
    city,
    countryCode,
    requiresCod,
  }: Omit<ParcelPartnerRequest, "requestedPartnerId">): Promise<ParcelPartnerChoice[]> {
    const deliveryZoneId = await deliveryZoneService.resolveZoneIdForCity(city, countryCode);
    const partnerZones = await logisticsShipmentBookingRepository.listActivePartnerChoices({
      hubId,
      deliveryZoneId,
      requiresCod,
    });
    return partnerZones.flatMap(({ partner }) => {
      const [account] = partner.accounts;
      return account
        ? [
            {
              partnerId: partner.id,
              partnerName: partner.name,
              partnerAccountId: account.id,
              connection: connectionFor(partner.adapterKey),
            },
          ]
        : [];
    });
  },

  async choosePartner(request: ParcelPartnerRequest): Promise<ParcelPartnerChoice | null> {
    const eligiblePartners = await logisticsParcelPartner.listEligiblePartners(request);
    const [preferredPartner] = eligiblePartners;
    if (request.requestedPartnerId === null) return preferredPartner ?? null;

    const requestedPartner = eligiblePartners.find(
      ({ partnerId }) => partnerId === request.requestedPartnerId,
    );
    if (!requestedPartner) {
      throw new AppError(
        "PARTNER_NOT_AVAILABLE",
        "That partner doesn't deliver this parcel from this hub. Pick another one.",
        HTTP_STATUS.CONFLICT,
      );
    }
    return requestedPartner;
  },
};
