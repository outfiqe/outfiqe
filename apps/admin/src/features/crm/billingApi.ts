import { apiClient } from "@/lib/apiClient";

import {
  type BillingOverview,
  billingOverviewSchema,
  type CheckoutRedirect,
  checkoutRedirectSchema,
  type CrmBillingProviderValue,
  type InvoicePage,
  invoicePageSchema,
  type InvoiceVerifyResult,
  invoiceVerifyResultSchema,
} from "./billingSchemas";

export const crmBillingApi = {
  async getOverview(): Promise<BillingOverview> {
    const res = await apiClient.get<BillingOverview>("/crm/billing");
    return billingOverviewSchema.parse(res.data);
  },

  async listInvoices(cursor?: string): Promise<InvoicePage> {
    const res = await apiClient.get<InvoicePage>("/crm/billing/invoices", {
      params: cursor ? { cursor } : undefined,
    });
    return invoicePageSchema.parse(res.data);
  },

  async checkout(input: {
    plan: string;
    seats: number;
    provider: CrmBillingProviderValue;
  }): Promise<CheckoutRedirect> {
    const res = await apiClient.post<CheckoutRedirect>("/crm/billing/checkout", input);
    return checkoutRedirectSchema.parse(res.data);
  },

  async payInvoice(
    invoiceId: string,
    provider: CrmBillingProviderValue,
  ): Promise<CheckoutRedirect> {
    const res = await apiClient.post<CheckoutRedirect>(`/crm/billing/invoices/${invoiceId}/pay`, {
      provider,
    });
    return checkoutRedirectSchema.parse(res.data);
  },

  async verifyInvoice(invoiceId: string): Promise<InvoiceVerifyResult> {
    const res = await apiClient.post<InvoiceVerifyResult>(
      `/crm/billing/invoices/${invoiceId}/verify`,
    );
    return invoiceVerifyResultSchema.parse(res.data);
  },

  async cancel(): Promise<void> {
    await apiClient.post("/crm/billing/cancel");
  },
};
