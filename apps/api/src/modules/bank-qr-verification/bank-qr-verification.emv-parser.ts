import {
  BITS_PER_BYTE,
  CRC16_BYTE_TO_HIGH_BYTE_SHIFT,
  CRC16_CCITT_INITIAL_VALUE,
  CRC16_CCITT_POLYNOMIAL,
  CRC16_HIGH_BIT,
  CRC16_VALUE_MASK,
  EMV_CRC_TAG,
  EMV_CRC_VALUE_LENGTH,
  EMV_FIRST_MERCHANT_ACCOUNT_TEMPLATE_TAG,
  EMV_LAST_MERCHANT_ACCOUNT_TEMPLATE_TAG,
  EMV_LENGTH_FIELD_LENGTH,
  EMV_MERCHANT_NAME_TAG,
  EMV_PAYLOAD_FORMAT_INDICATOR_TAG,
  EMV_PAYLOAD_FORMAT_INDICATOR_VALUE,
  EMV_TAG_LENGTH,
  HEX_RADIX,
  SINGLE_BIT_SHIFT,
} from "./bank-qr-verification.constants.js";
import type { EmvMerchantAccountTemplate, ParsedEmvPayload } from "./bank-qr-verification.types.js";

type EmvDataObject = { tag: string; value: string };

const TWO_DIGIT_FIELD = /^\d{2}$/;
const DATA_OBJECT_HEADER_LENGTH = EMV_TAG_LENGTH + EMV_LENGTH_FIELD_LENGTH;
const START_OF_TEXT = 0;
const FIRST_BIT_INDEX = 0;
const LAST_DATA_OBJECT_INDEX = -1;

const parseDataObjects = (text: string): EmvDataObject[] | null => {
  const dataObjects: EmvDataObject[] = [];
  let cursor = START_OF_TEXT;

  while (cursor < text.length) {
    const tag = text.slice(cursor, cursor + EMV_TAG_LENGTH);
    const lengthField = text.slice(cursor + EMV_TAG_LENGTH, cursor + DATA_OBJECT_HEADER_LENGTH);
    if (!TWO_DIGIT_FIELD.test(tag) || !TWO_DIGIT_FIELD.test(lengthField)) return null;

    const valueStart = cursor + DATA_OBJECT_HEADER_LENGTH;
    const valueEnd = valueStart + Number(lengthField);
    if (valueEnd > text.length) return null;

    dataObjects.push({ tag, value: text.slice(valueStart, valueEnd) });
    cursor = valueEnd;
  }

  return dataObjects;
};

const isMerchantAccountTemplateTag = (tag: string): boolean => {
  const tagNumber = Number(tag);
  return (
    tagNumber >= EMV_FIRST_MERCHANT_ACCOUNT_TEMPLATE_TAG &&
    tagNumber <= EMV_LAST_MERCHANT_ACCOUNT_TEMPLATE_TAG
  );
};

const toMerchantAccountTemplate = ({ tag, value }: EmvDataObject): EmvMerchantAccountTemplate => ({
  templateTag: tag,
  subFields: new Map(
    (parseDataObjects(value) ?? []).map((subField) => [subField.tag, subField.value]),
  ),
});

export const computeCrc16Ccitt = (text: string): string => {
  let crc = CRC16_CCITT_INITIAL_VALUE;

  for (const byte of Buffer.from(text, "utf8")) {
    crc ^= byte << CRC16_BYTE_TO_HIGH_BYTE_SHIFT;
    for (let bitIndex = FIRST_BIT_INDEX; bitIndex < BITS_PER_BYTE; bitIndex += SINGLE_BIT_SHIFT) {
      const shiftedCrc = crc << SINGLE_BIT_SHIFT;
      crc =
        (crc & CRC16_HIGH_BIT ? shiftedCrc ^ CRC16_CCITT_POLYNOMIAL : shiftedCrc) &
        CRC16_VALUE_MASK;
    }
  }

  return crc.toString(HEX_RADIX).toUpperCase().padStart(EMV_CRC_VALUE_LENGTH, "0");
};

const INVALID_CHECKSUM = false;

const hasValidChecksum = (text: string, dataObjects: EmvDataObject[]): boolean => {
  const lastDataObject = dataObjects.at(LAST_DATA_OBJECT_INDEX);
  if (lastDataObject?.tag !== EMV_CRC_TAG || lastDataObject.value.length !== EMV_CRC_VALUE_LENGTH) {
    return INVALID_CHECKSUM;
  }

  const checksummedText = text.slice(START_OF_TEXT, text.length - EMV_CRC_VALUE_LENGTH);
  return computeCrc16Ccitt(checksummedText) === lastDataObject.value.toUpperCase();
};

export const parseEmvPayload = (qrText: string): ParsedEmvPayload | null => {
  const payloadText = qrText.trim();
  const dataObjects = parseDataObjects(payloadText);
  if (!dataObjects) return null;

  const [firstDataObject] = dataObjects;
  if (
    firstDataObject?.tag !== EMV_PAYLOAD_FORMAT_INDICATOR_TAG ||
    firstDataObject.value !== EMV_PAYLOAD_FORMAT_INDICATOR_VALUE
  ) {
    return null;
  }

  const merchantNameObject = dataObjects.find(({ tag }) => tag === EMV_MERCHANT_NAME_TAG);

  return {
    merchantName: merchantNameObject?.value.trim() || null,
    merchantAccountTemplates: dataObjects
      .filter(({ tag }) => isMerchantAccountTemplateTag(tag))
      .map(toMerchantAccountTemplate),
    hasValidChecksum: hasValidChecksum(payloadText, dataObjects),
  };
};
