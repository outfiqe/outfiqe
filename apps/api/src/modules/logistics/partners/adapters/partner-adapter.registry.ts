import { createManualAdapter, MANUAL_ADAPTER_KEY } from "./manual.adapter.js";
import type {
  CreateDeliveryPartnerAdapter,
  DeliveryPartnerAccountConfig,
  DeliveryPartnerAdapter,
} from "./partner-adapter.types.js";

type PartnerAdapterCapabilities = {
  supportsBooking: boolean;
  supportsWebhooks: boolean;
  supportsPolling: boolean;
};

type PartnerAdapterRegistration = {
  createAdapter: CreateDeliveryPartnerAdapter;
  capabilities: PartnerAdapterCapabilities;
};

const MANUAL_REGISTRATION: PartnerAdapterRegistration = {
  createAdapter: createManualAdapter,
  capabilities: { supportsBooking: false, supportsWebhooks: false, supportsPolling: false },
};

const ADAPTER_REGISTRATIONS: Readonly<Record<string, PartnerAdapterRegistration>> = {
  [MANUAL_ADAPTER_KEY]: MANUAL_REGISTRATION,
};

export const PARTNER_ADAPTER_KEYS: readonly string[] = Object.keys(ADAPTER_REGISTRATIONS);

export const isKnownPartnerAdapterKey = (adapterKey: string): boolean =>
  Object.hasOwn(ADAPTER_REGISTRATIONS, adapterKey);

const registrationFor = (adapterKey: string): PartnerAdapterRegistration =>
  ADAPTER_REGISTRATIONS[adapterKey] ?? MANUAL_REGISTRATION;

export const partnerAdapterRegistry = {
  createAdapter(adapterKey: string, account: DeliveryPartnerAccountConfig): DeliveryPartnerAdapter {
    return registrationFor(adapterKey).createAdapter(account);
  },

  describeCapabilities(adapterKey: string): PartnerAdapterCapabilities {
    return registrationFor(adapterKey).capabilities;
  },
};
