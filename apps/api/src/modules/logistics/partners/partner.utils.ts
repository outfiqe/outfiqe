import { readDeliveryPartnerCredentials } from "#config/delivery-partner.config.js";
import { env } from "#config/env.config.js";

import type { PartnerRecord } from "./partner.repository.js";
import type { PartnerCredentialsStatus, PartnerView } from "./partner.types.js";

const PARTNER_WEBHOOK_PATH = "/api/webhooks/delivery-partners";
const TRAILING_SLASHES = /\/+$/;

export const buildPartnerWebhookUrl = (partnerCode: string): string =>
  `${env.API_PUBLIC_URL.replace(TRAILING_SLASHES, "")}${PARTNER_WEBHOOK_PATH}/${partnerCode}`;

export const describePartnerCredentials = (
  credentialsKey: string | null,
): PartnerCredentialsStatus => {
  const { apiKey, baseUrl, webhookSecret, previousWebhookSecret } =
    readDeliveryPartnerCredentials(credentialsKey);
  return {
    hasApiKey: apiKey !== null,
    hasBaseUrl: baseUrl !== null,
    hasWebhookSecret: webhookSecret !== null,
    hasPreviousWebhookSecret: previousWebhookSecret !== null,
  };
};

export const toPartnerView = ({
  accounts,
  zones,
  statusMappings,
  createdAt: _createdAt,
  updatedAt: _updatedAt,
  ...partner
}: PartnerRecord): PartnerView => ({
  ...partner,
  webhookUrl: partner.supportsWebhooks ? buildPartnerWebhookUrl(partner.code) : null,
  accounts: accounts.map(
    ({ hubId, hub, merchantAccountRef, pickupPointRef, credentialsKey, isActive }) => ({
      hubId,
      hubName: hub.name,
      merchantAccountRef,
      pickupPointRef,
      credentialsKey,
      credentials: describePartnerCredentials(credentialsKey),
      isActive,
    }),
  ),
  zones: zones.map(({ hubId, deliveryZoneId, deliveryZone, priority, isActive }) => ({
    hubId,
    deliveryZoneId,
    deliveryZoneName: deliveryZone.name,
    priority,
    isActive,
  })),
  statusMappings: statusMappings.map(({ rawStatus, canonicalCode, reasonCode }) => ({
    rawStatus,
    canonicalCode,
    reasonCode,
  })),
});
