export const COD_HANDLING_FEE = 50;

export const PAYMENT_METHODS = [
  {
    value: "COD",
    label: "Cash on delivery",
    description: "Pay the rider when it arrives.",
    enabled: true,
  },
  {
    value: "ESEWA",
    label: "eSewa",
    description: "Pay now from your eSewa wallet.",
    enabled: false,
  },
  {
    value: "KHALTI",
    label: "Khalti",
    description: "Pay now from your Khalti wallet.",
    enabled: false,
  },
] as const;
