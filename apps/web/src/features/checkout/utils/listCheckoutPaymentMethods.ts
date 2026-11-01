import { PaymentMethod } from "../api/checkoutSchemas";
import { PAYMENT_METHODS } from "../constants/checkout.constants";

export const listCheckoutPaymentMethods = (isKhaltiOn: boolean) =>
  PAYMENT_METHODS.filter(({ value }) => isKhaltiOn || value !== PaymentMethod.KHALTI);
