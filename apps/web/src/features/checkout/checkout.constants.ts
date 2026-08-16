import { PaymentMethod } from "./api/checkoutSchemas";

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
