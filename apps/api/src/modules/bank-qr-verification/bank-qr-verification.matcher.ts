import { BankQrCheckReason, BankQrCheckStatus } from "#generated/prisma/enums.js";
import { isSameNameIgnoringWordOrder } from "#lib/name-mismatch.utils.js";

import {
  BANK_QR_FORMAT,
  BANK_QR_REJECTION,
  CONFIRMED_QR_ACCOUNT_FIELD_LOCATIONS,
  EMV_OPERATOR_GUID_SUB_TAG,
  SWIFT_BANK_CODE_LENGTH,
} from "./bank-qr-verification.constants.js";
import type {
  BankAccountQrDetails,
  BankQrMatchResult,
  BankQrRejection,
  BankQrTypedDetails,
  ConfirmedQrAccountFieldLocation,
  EmvMerchantAccountTemplate,
  ParsedEmvPayload,
  ReadBankQr,
} from "./bank-qr-verification.types.js";

const ACCOUNT_NUMBER_SEPARATORS = /[\s-]/g;

export const normalizeAccountNumber = (accountNumber: string): string =>
  accountNumber.replace(ACCOUNT_NUMBER_SEPARATORS, "");

const toSwiftBankCode = (swiftCode: string): string =>
  swiftCode.trim().toUpperCase().slice(0, SWIFT_BANK_CODE_LENGTH);

const needsReview = (qrCheckReason: BankQrCheckReason): BankQrMatchResult => ({
  isRejected: false,
  qrCheckStatus: BankQrCheckStatus.NEEDS_REVIEW,
  qrCheckReason,
});

const findFieldLocation = (
  template: EmvMerchantAccountTemplate,
  fieldLocations: readonly ConfirmedQrAccountFieldLocation[],
): ConfirmedQrAccountFieldLocation | undefined => {
  const operatorGuid = template.subFields.get(EMV_OPERATOR_GUID_SUB_TAG);
  return fieldLocations.find((fieldLocation) => fieldLocation.operatorGuid === operatorGuid);
};

const collectConfirmedFieldValues = (
  payload: ParsedEmvPayload,
  fieldLocations: readonly ConfirmedQrAccountFieldLocation[],
  pickSubTag: (fieldLocation: ConfirmedQrAccountFieldLocation) => string | undefined,
): string[] =>
  payload.merchantAccountTemplates.flatMap((template) => {
    const fieldLocation = findFieldLocation(template, fieldLocations);
    const subTag = fieldLocation && pickSubTag(fieldLocation);
    const fieldValue = subTag === undefined ? undefined : template.subFields.get(subTag);
    return fieldValue === undefined ? [] : [fieldValue];
  });

const findContradiction = (
  payload: ParsedEmvPayload,
  { accountNumber, bankCode }: BankQrTypedDetails,
  fieldLocations: readonly ConfirmedQrAccountFieldLocation[],
): BankQrRejection | null => {
  const confirmedAccountNumbers = collectConfirmedFieldValues(
    payload,
    fieldLocations,
    ({ accountNumberSubTag }) => accountNumberSubTag,
  );
  if (
    confirmedAccountNumbers.some((qrNumber) => normalizeAccountNumber(qrNumber) !== accountNumber)
  ) {
    return BANK_QR_REJECTION.ACCOUNT_NUMBER_CONTRADICTS_QR;
  }

  const confirmedBankCodes = collectConfirmedFieldValues(
    payload,
    fieldLocations,
    ({ bankCodeSubTag }) => bankCodeSubTag,
  );
  if (
    confirmedBankCodes.some((qrBankCode) => qrBankCode.toUpperCase() !== bankCode.toUpperCase())
  ) {
    return BANK_QR_REJECTION.BANK_CONTRADICTS_QR;
  }

  return null;
};

const containsAccountNumber = (payload: ParsedEmvPayload, accountNumber: string): boolean =>
  payload.merchantAccountTemplates.some((template) =>
    [...template.subFields].some(
      ([subTag, fieldValue]) =>
        subTag !== EMV_OPERATOR_GUID_SUB_TAG &&
        normalizeAccountNumber(fieldValue) === accountNumber,
    ),
  );

export const findConfirmedAccountNumber = (
  payload: ParsedEmvPayload,
  fieldLocations: readonly ConfirmedQrAccountFieldLocation[] = CONFIRMED_QR_ACCOUNT_FIELD_LOCATIONS,
): string | null => {
  const [confirmedAccountNumber] = collectConfirmedFieldValues(
    payload,
    fieldLocations,
    ({ accountNumberSubTag }) => accountNumberSubTag,
  );
  return confirmedAccountNumber === undefined
    ? null
    : normalizeAccountNumber(confirmedAccountNumber);
};

export const matchQrPayloadAgainstTypedDetails = (
  payload: ParsedEmvPayload | null,
  typedDetails: BankQrTypedDetails,
  fieldLocations: readonly ConfirmedQrAccountFieldLocation[] = CONFIRMED_QR_ACCOUNT_FIELD_LOCATIONS,
): BankQrMatchResult => {
  if (!payload) return needsReview(BankQrCheckReason.NOT_PAYMENT_QR);
  if (!payload.hasValidChecksum) return needsReview(BankQrCheckReason.INVALID_CHECKSUM);

  const contradiction = findContradiction(payload, typedDetails, fieldLocations);
  if (contradiction) return { isRejected: true, rejection: contradiction };

  const { merchantName } = payload;
  if (!merchantName) return needsReview(BankQrCheckReason.NAME_NOT_FOUND);
  if (!isSameNameIgnoringWordOrder(merchantName, typedDetails.accountName)) {
    return needsReview(BankQrCheckReason.NAME_DIFFERS);
  }

  if (!containsAccountNumber(payload, typedDetails.accountNumber)) {
    return needsReview(BankQrCheckReason.ACCOUNT_NUMBER_NOT_FOUND);
  }

  return { isRejected: false, qrCheckStatus: BankQrCheckStatus.MATCHED, qrCheckReason: null };
};

const matchAccountJsonAgainstTypedDetails = (
  { accountName, accountNumber, bankSwiftCode: qrBankSwiftCode }: BankAccountQrDetails,
  typedDetails: BankQrTypedDetails,
  knownBankSwiftCodes: ReadonlySet<string>,
): BankQrMatchResult => {
  if (normalizeAccountNumber(accountNumber) !== typedDetails.accountNumber) {
    return { isRejected: true, rejection: BANK_QR_REJECTION.ACCOUNT_NUMBER_CONTRADICTS_QR };
  }

  const qrBank = qrBankSwiftCode ? toSwiftBankCode(qrBankSwiftCode) : null;
  const pickedBank = typedDetails.bankSwiftCode
    ? toSwiftBankCode(typedDetails.bankSwiftCode)
    : null;
  const isQrForPickedBank = qrBank !== null && qrBank === pickedBank;
  if (qrBank && !isQrForPickedBank && knownBankSwiftCodes.has(qrBank)) {
    return { isRejected: true, rejection: BANK_QR_REJECTION.BANK_CONTRADICTS_QR };
  }

  if (!isSameNameIgnoringWordOrder(accountName, typedDetails.accountName)) {
    return needsReview(BankQrCheckReason.NAME_DIFFERS);
  }
  if (!isQrForPickedBank) return needsReview(BankQrCheckReason.BANK_NOT_CONFIRMED);

  return { isRejected: false, qrCheckStatus: BankQrCheckStatus.MATCHED, qrCheckReason: null };
};

export const matchBankQrAgainstTypedDetails = (
  readQr: ReadBankQr | null,
  typedDetails: BankQrTypedDetails,
  knownBankSwiftCodes: ReadonlySet<string>,
  fieldLocations: readonly ConfirmedQrAccountFieldLocation[] = CONFIRMED_QR_ACCOUNT_FIELD_LOCATIONS,
): BankQrMatchResult => {
  if (!readQr) return needsReview(BankQrCheckReason.NOT_PAYMENT_QR);
  if (readQr.format === BANK_QR_FORMAT.EMV) {
    return matchQrPayloadAgainstTypedDetails(readQr.emvPayload, typedDetails, fieldLocations);
  }
  return matchAccountJsonAgainstTypedDetails(
    readQr.accountDetails,
    typedDetails,
    knownBankSwiftCodes,
  );
};
