import { CRM_BILLING_PROVIDER, type CrmBillingProviderValue } from "../api/billingSchemas";

export const listBillingProviders = (isKhaltiOn: boolean): CrmBillingProviderValue[] =>
  Object.values(CRM_BILLING_PROVIDER).filter(
    (provider) => isKhaltiOn || provider !== CRM_BILLING_PROVIDER.KHALTI,
  );
