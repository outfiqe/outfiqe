import type {
  DeliveryFailureReason,
  PartnerStatusImportRowOutcome,
  PartnerWebhookVerification,
  TrackingEventCode,
} from "#generated/prisma/enums.js";

export type PartnerCredentialsStatus = {
  hasApiKey: boolean;
  hasBaseUrl: boolean;
  hasWebhookSecret: boolean;
  hasPreviousWebhookSecret: boolean;
};

export type PartnerAccountView = {
  hubId: string;
  hubName: string;
  merchantAccountRef: string;
  pickupPointRef: string | null;
  credentialsKey: string | null;
  credentials: PartnerCredentialsStatus;
  isActive: boolean;
};

export type PartnerZoneView = {
  hubId: string;
  deliveryZoneId: string;
  deliveryZoneName: string;
  priority: number;
  isActive: boolean;
};

export type PartnerStatusMappingView = {
  rawStatus: string;
  canonicalCode: TrackingEventCode;
  reasonCode: DeliveryFailureReason | null;
};

export type PartnerView = {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  adapterKey: string;
  isActive: boolean;
  supportsBooking: boolean;
  supportsWebhooks: boolean;
  supportsPolling: boolean;
  supportsCod: boolean;
  supportsCodAmountUpdate: boolean;
  supportsCancel: boolean;
  webhookVerification: PartnerWebhookVerification;
  referencePattern: string | null;
  codRemittanceDays: number;
  trackingUrlTemplate: string | null;
  webhookUrl: string | null;
  accounts: PartnerAccountView[];
  zones: PartnerZoneView[];
  statusMappings: PartnerStatusMappingView[];
};

export type PartnerStatusImportRowView = {
  rowNumber: number;
  partnerReference: string | null;
  merchantReference: string | null;
  rawStatus: string | null;
  outcome: PartnerStatusImportRowOutcome;
  message: string | null;
};

export type PartnerStatusImportView = {
  id: string;
  partnerId: string;
  fileName: string;
  rowCount: number;
  appliedCount: number;
  createdAt: string;
  rows: PartnerStatusImportRowView[];
};
