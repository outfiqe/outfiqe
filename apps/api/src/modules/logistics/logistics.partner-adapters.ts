import { partnerAdapterRegistry } from "./partners/adapters/partner-adapter.registry.js";
import type { DeliveryPartnerAdapter } from "./partners/adapters/partner-adapter.types.js";

type PartnerForAdapter = { id: string; code: string; adapterKey: string };

type AccountForAdapter = {
  id: string;
  hubId: string;
  merchantAccountRef: string;
  pickupPointRef: string | null;
  credentialsKey: string | null;
};

export const logisticsPartnerAdapters = {
  forAccount(partner: PartnerForAdapter, account: AccountForAdapter): DeliveryPartnerAdapter {
    return partnerAdapterRegistry.createAdapter(partner.adapterKey, {
      accountId: account.id,
      partnerId: partner.id,
      partnerCode: partner.code,
      hubId: account.hubId,
      merchantAccountRef: account.merchantAccountRef,
      pickupPointRef: account.pickupPointRef,
      credentialsKey: account.credentialsKey,
    });
  },
};
