import QRCode from "qrcode";
import sharp from "sharp";

import {
  EMV_CRC_TAG,
  EMV_CRC_VALUE_LENGTH,
  EMV_LENGTH_FIELD_LENGTH,
  EMV_MERCHANT_NAME_TAG,
  EMV_OPERATOR_GUID_SUB_TAG,
  EMV_PAYLOAD_FORMAT_INDICATOR_TAG,
  EMV_PAYLOAD_FORMAT_INDICATOR_VALUE,
} from "#modules/bank-qr-verification/bank-qr-verification.constants.js";
import { computeCrc16Ccitt } from "#modules/bank-qr-verification/bank-qr-verification.emv-parser.js";

export const TEST_BANK_QR_OPERATOR_GUID = "np.com.outfiqe.testbank";
export const TEST_ACCOUNT_NUMBER_SUB_TAG = "01";
export const TEST_BANK_CODE_SUB_TAG = "02";
export const TEST_NEPALPAY_TEMPLATE_TAG = "29";

const POINT_OF_INITIATION_TAG = "01";
const STATIC_QR_INITIATION_VALUE = "11";
const MERCHANT_CATEGORY_TAG = "52";
const PERSONAL_MERCHANT_CATEGORY = "0000";
const CURRENCY_TAG = "53";
const NEPALI_RUPEE_CURRENCY = "524";
const COUNTRY_TAG = "58";
const NEPAL_COUNTRY = "NP";
const CITY_TAG = "60";
const TEST_CITY = "Kathmandu";
const QR_IMAGE_WIDTH_PX = 400;
const QR_QUIET_ZONE_MODULES = 4;
const BLANK_IMAGE_SIZE_PX = 300;
const WHITE = { r: 255, g: 255, b: 255 };

type BankQrPayloadFields = {
  accountName?: string | null;
  accountNumber?: string;
  bankCode?: string;
  operatorGuid?: string;
  templateTag?: string;
};

const encodeDataObject = (tag: string, value: string): string =>
  `${tag}${String(value.length).padStart(EMV_LENGTH_FIELD_LENGTH, "0")}${value}`;

export const buildBankQrPayload = ({
  accountName = "Sabin Shrestha",
  accountNumber = "1234567890",
  bankCode,
  operatorGuid = TEST_BANK_QR_OPERATOR_GUID,
  templateTag = TEST_NEPALPAY_TEMPLATE_TAG,
}: BankQrPayloadFields = {}): string => {
  const accountTemplate = [
    encodeDataObject(EMV_OPERATOR_GUID_SUB_TAG, operatorGuid),
    encodeDataObject(TEST_ACCOUNT_NUMBER_SUB_TAG, accountNumber),
    bankCode ? encodeDataObject(TEST_BANK_CODE_SUB_TAG, bankCode) : "",
  ].join("");

  const payloadWithoutChecksum = [
    encodeDataObject(EMV_PAYLOAD_FORMAT_INDICATOR_TAG, EMV_PAYLOAD_FORMAT_INDICATOR_VALUE),
    encodeDataObject(POINT_OF_INITIATION_TAG, STATIC_QR_INITIATION_VALUE),
    encodeDataObject(templateTag, accountTemplate),
    encodeDataObject(MERCHANT_CATEGORY_TAG, PERSONAL_MERCHANT_CATEGORY),
    encodeDataObject(CURRENCY_TAG, NEPALI_RUPEE_CURRENCY),
    encodeDataObject(COUNTRY_TAG, NEPAL_COUNTRY),
    accountName === null ? "" : encodeDataObject(EMV_MERCHANT_NAME_TAG, accountName),
    encodeDataObject(CITY_TAG, TEST_CITY),
    `${EMV_CRC_TAG}${String(EMV_CRC_VALUE_LENGTH).padStart(EMV_LENGTH_FIELD_LENGTH, "0")}`,
  ].join("");

  return `${payloadWithoutChecksum}${computeCrc16Ccitt(payloadWithoutChecksum)}`;
};

export const breakChecksum = (payload: string): string => {
  const payloadWithoutChecksum = payload.slice(0, -EMV_CRC_VALUE_LENGTH);
  const checksum = payload.slice(-EMV_CRC_VALUE_LENGTH);
  return `${payloadWithoutChecksum}${checksum === "0000" ? "FFFF" : "0000"}`;
};

export const renderQrPng = (qrText: string): Promise<Buffer> =>
  QRCode.toBuffer(qrText, { type: "png", width: QR_IMAGE_WIDTH_PX, margin: QR_QUIET_ZONE_MODULES });

export const renderBlankPng = (): Promise<Buffer> =>
  sharp({
    create: {
      width: BLANK_IMAGE_SIZE_PX,
      height: BLANK_IMAGE_SIZE_PX,
      channels: 3,
      background: WHITE,
    },
  })
    .png()
    .toBuffer();
