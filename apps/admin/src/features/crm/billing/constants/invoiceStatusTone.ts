import type { InvoiceStatusValue } from "../api/billingSchemas";

export const INVOICE_STATUS_TONE: Record<InvoiceStatusValue, "neutral" | "positive" | "negative"> =
  {
    OPEN: "neutral",
    PAID: "positive",
    VOID: "negative",
  };
