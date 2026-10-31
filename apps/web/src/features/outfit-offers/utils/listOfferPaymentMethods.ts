import { OFFER_PAYMENT_METHODS, type OfferPaymentMethod } from "../api/offerSchemas";

const KHALTI_OFFER_PAYMENT: OfferPaymentMethod = "KHALTI";

export const listOfferPaymentMethods = (isKhaltiOn: boolean): OfferPaymentMethod[] =>
  OFFER_PAYMENT_METHODS.filter((method) => isKhaltiOn || method !== KHALTI_OFFER_PAYMENT);
