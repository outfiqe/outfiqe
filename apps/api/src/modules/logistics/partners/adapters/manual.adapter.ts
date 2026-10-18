import type { CreateDeliveryPartnerAdapter } from "./partner-adapter.types.js";

export const MANUAL_ADAPTER_KEY = "MANUAL";

export const createManualAdapter: CreateDeliveryPartnerAdapter = () => ({ isManual: true });
