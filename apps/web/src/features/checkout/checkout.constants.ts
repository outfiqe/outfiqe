import { PaymentMethod } from "./api/checkoutSchemas";

export const COD_HANDLING_FEE = 50;

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
    enabled: false,
  },
  {
    value: PaymentMethod.KHALTI,
    label: "Khalti",
    description: "Pay now from your Khalti wallet.",
    enabled: false,
  },
] as const;
