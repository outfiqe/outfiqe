export type DeliveryPartnerAccountConfig = {
  accountId: string;
  partnerId: string;
  partnerCode: string;
  hubId: string;
  merchantAccountRef: string;
  pickupPointRef: string | null;
  credentialsKey: string | null;
};

export type PartnerAddress = {
  line1: string;
  landmark: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
};

export type PartnerBookingRequest = {
  merchantReference: string;
  idempotencyKey: string;
  pickup: { name: string; phoneE164: string; address: PartnerAddress };
  recipient: { fullName: string; phoneE164: string; address: PartnerAddress };
  currency: string;
  codAmount: number;
  declaredValue: number;
  weightGrams: number;
  parcelCount: number;
  contentsDescription: string;
};

export type PartnerBookingResult = {
  partnerReference: string;
  labelUrl: string | null;
  partnerTrackingUrl: string | null;
};

export type PartnerTrackingEvent = {
  partnerReference: string | null;
  merchantReference: string | null;
  partnerEventId: string | null;
  rawStatus: string;
  occurredAt: Date;
  location: string | null;
  rawReason: string | null;
  codCollectedAmount: number | null;
  rawPayload: unknown;
};

export type DeliveryPartnerAdapter = {
  isManual: boolean;
  createShipment?(request: PartnerBookingRequest): Promise<PartnerBookingResult>;
  cancelShipment?(partnerReference: string): Promise<void>;
  updateCodAmount?(partnerReference: string, codAmount: number): Promise<void>;
  fetchTrackingEvents?(partnerReference: string, since: Date): Promise<PartnerTrackingEvent[]>;
  verifyWebhook?(headers: Record<string, string>, rawBody: Buffer): boolean;
  parseWebhook?(rawBody: Buffer): PartnerTrackingEvent[];
};

export type CreateDeliveryPartnerAdapter = (
  account: DeliveryPartnerAccountConfig,
) => DeliveryPartnerAdapter;
