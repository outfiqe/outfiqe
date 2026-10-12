import { HTTP_STATUS } from "#constants/http.constants.js";

import type {
  BankQrRejection,
  ConfirmedQrAccountFieldLocation,
  QrDecodePass,
} from "./bank-qr-verification.types.js";

export const EMV_TAG_LENGTH = 2;
export const EMV_LENGTH_FIELD_LENGTH = 2;
export const EMV_PAYLOAD_FORMAT_INDICATOR_TAG = "00";
export const EMV_PAYLOAD_FORMAT_INDICATOR_VALUE = "01";
export const EMV_MERCHANT_NAME_TAG = "59";
export const EMV_CRC_TAG = "63";
export const EMV_CRC_VALUE_LENGTH = 4;
export const EMV_FIRST_MERCHANT_ACCOUNT_TEMPLATE_TAG = 26;
export const EMV_LAST_MERCHANT_ACCOUNT_TEMPLATE_TAG = 51;
export const EMV_OPERATOR_GUID_SUB_TAG = "00";

export const CRC16_CCITT_POLYNOMIAL = 0x1021;
export const CRC16_CCITT_INITIAL_VALUE = 0xffff;
export const CRC16_VALUE_MASK = 0xffff;
export const CRC16_HIGH_BIT = 0x8000;
export const CRC16_BYTE_TO_HIGH_BYTE_SHIFT = 8;
export const BITS_PER_BYTE = 8;
export const SINGLE_BIT_SHIFT = 1;
export const HEX_RADIX = 16;

export const RGBA_CHANNEL_COUNT = 4;

export const QR_DECODE_PASSES: readonly QrDecodePass[] = [
  { maxDimensionPx: 1600, shouldNormaliseContrast: false },
  { maxDimensionPx: 1600, shouldNormaliseContrast: true },
  { maxDimensionPx: 800, shouldNormaliseContrast: false },
];

export const CONFIRMED_QR_ACCOUNT_FIELD_LOCATIONS: readonly ConfirmedQrAccountFieldLocation[] = [];

export const BANK_QR_REJECTION = {
  NO_QR_FOUND: "NO_QR_FOUND",
  ACCOUNT_NUMBER_CONTRADICTS_QR: "ACCOUNT_NUMBER_CONTRADICTS_QR",
  BANK_CONTRADICTS_QR: "BANK_CONTRADICTS_QR",
} as const;

export const BANK_QR_REJECTION_ERRORS: Record<BankQrRejection, { code: string; message: string }> =
  {
    NO_QR_FOUND: {
      code: "BANK_QR_NOT_FOUND",
      message: "We couldn't find a QR code in that photo. Upload a clear photo or screenshot.",
    },
    ACCOUNT_NUMBER_CONTRADICTS_QR: {
      code: "BANK_QR_ACCOUNT_NUMBER_MISMATCH",
      message: "The account number on your QR doesn't match the one you entered.",
    },
    BANK_CONTRADICTS_QR: {
      code: "BANK_QR_BANK_MISMATCH",
      message: "The bank on your QR doesn't match the bank you picked.",
    },
  };

export const BANK_QR_IMAGE_NOT_UPLOADED_ERROR = {
  code: "BANK_QR_IMAGE_NOT_UPLOADED",
  message: "Upload your bank QR photo again.",
};

export const BANK_QR_REJECTED_STATUS = HTTP_STATUS.UNPROCESSABLE_ENTITY;
