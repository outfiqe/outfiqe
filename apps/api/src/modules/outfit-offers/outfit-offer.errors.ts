import { AppError } from "#middlewares/error-handler.js";

const BAD_REQUEST_STATUS = 400;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;

export const offerErrors = {
  notFound: () => new AppError("OFFER_NOT_FOUND", "Offer not found.", NOT_FOUND_STATUS),

  notABrandOnBuild: () =>
    new AppError(
      "NOT_A_BRAND_ON_BUILD",
      "Only a brand that is on this build can send an offer from it.",
      FORBIDDEN_STATUS,
    ),

  buildNotLocked: () =>
    new AppError("OUTFIT_NOT_LOCKED", "Lock the build before sending an offer.", CONFLICT_STATUS),

  creatorNotOnBuild: () =>
    new AppError(
      "CREATOR_NOT_ON_BUILD",
      "Offers can only go to an approved muse who is on this build.",
      UNPROCESSABLE_STATUS,
    ),

  amountOutOfRange: (minimum: number, maximum: number) =>
    new AppError(
      "OFFER_AMOUNT_OUT_OF_RANGE",
      `Offers must be between Rs. ${minimum} and Rs. ${maximum}.`,
      UNPROCESSABLE_STATUS,
    ),

  alreadyOpen: () =>
    new AppError(
      "OFFER_ALREADY_OPEN",
      "There's already an open offer to this muse for this build.",
      CONFLICT_STATUS,
    ),

  invalidTransition: (message: string) =>
    new AppError("INVALID_TRANSITION", message, CONFLICT_STATUS),

  unsupportedPaymentMethod: () =>
    new AppError(
      "UNSUPPORTED_PAYMENT_METHOD",
      "Offers can be paid with eSewa or Khalti.",
      BAD_REQUEST_STATUS,
    ),
};
