import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const offerErrors = {
  notFound: () => new AppError("OFFER_NOT_FOUND", "Offer not found.", HTTP_STATUS.NOT_FOUND),

  notABrandOnBuild: () =>
    new AppError(
      "NOT_A_BRAND_ON_BUILD",
      "Only a brand that is on this build can send an offer from it.",
      HTTP_STATUS.FORBIDDEN,
    ),

  buildNotLocked: () =>
    new AppError(
      "OUTFIT_NOT_LOCKED",
      "Lock the build before sending an offer.",
      HTTP_STATUS.CONFLICT,
    ),

  creatorNotOnBuild: () =>
    new AppError(
      "CREATOR_NOT_ON_BUILD",
      "Offers can only go to an approved muse who is on this build.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  amountOutOfRange: (minimum: number, maximum: number) =>
    new AppError(
      "OFFER_AMOUNT_OUT_OF_RANGE",
      `Offers must be between Rs. ${minimum} and Rs. ${maximum}.`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  alreadyOpen: () =>
    new AppError(
      "OFFER_ALREADY_OPEN",
      "There's already an open offer to this muse for this build.",
      HTTP_STATUS.CONFLICT,
    ),

  invalidTransition: (message: string) =>
    new AppError("INVALID_TRANSITION", message, HTTP_STATUS.CONFLICT),

  unsupportedPaymentMethod: () =>
    new AppError(
      "UNSUPPORTED_PAYMENT_METHOD",
      "Offers can be paid with eSewa or Khalti.",
      HTTP_STATUS.BAD_REQUEST,
    ),
};
