import { PaymentMethod } from "../api/checkoutSchemas";

export const PAYMENT_METHODS = [
  {
    value: PaymentMethod.COD,
    label: "Cash on delivery",
    description: "Pay the rider when it arrives.",
    enabled: true,
  },
  {
    value: PaymentMethod.ESEWA,
    label: "eSewa",
    description: "Pay now from your eSewa wallet.",
    enabled: true,
  },
  {
    value: PaymentMethod.KHALTI,
    label: "Khalti",
    description: "Pay now from your Khalti wallet.",
    enabled: true,
  },
] as const;

export const COD_ELIGIBILITY_PHONE_DEBOUNCE_MS = 500;

export const COD_UNAVAILABLE_REASON = {
  PREPAID_COUPON: "Your coupon requires a prepaid payment method",
  REFUSED_DELIVERIES: "Not available on this account after refused deliveries. Please pay online.",
} as const;
