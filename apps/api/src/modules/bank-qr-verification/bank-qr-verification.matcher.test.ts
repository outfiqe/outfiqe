import { describe, expect, it } from "vitest";

import { BankQrCheckReason, BankQrCheckStatus } from "#generated/prisma/enums.js";
import {
  breakChecksum,
  buildBankQrPayload,
  TEST_ACCOUNT_NUMBER_SUB_TAG,
  TEST_BANK_CODE_SUB_TAG,
  TEST_BANK_QR_OPERATOR_GUID,
} from "#test/bank-qr-test-codes.js";

import { BANK_QR_REJECTION } from "./bank-qr-verification.constants.js";
import { parseEmvPayload } from "./bank-qr-verification.emv-parser.js";
import {
  findConfirmedAccountNumber,
  matchQrPayloadAgainstTypedDetails,
} from "./bank-qr-verification.matcher.js";
import type { ConfirmedQrAccountFieldLocation } from "./bank-qr-verification.types.js";

const typedDetails = {
  accountName: "Sabin Shrestha",
  accountNumber: "1234567890",
  bankCode: "A03",
};

const confirmedTestBankFields: ConfirmedQrAccountFieldLocation[] = [
  {
    operatorGuid: TEST_BANK_QR_OPERATOR_GUID,
    accountNumberSubTag: TEST_ACCOUNT_NUMBER_SUB_TAG,
    bankCodeSubTag: TEST_BANK_CODE_SUB_TAG,
  },
];

const needsReview = (qrCheckReason: BankQrCheckReason) => ({
  isRejected: false,
  qrCheckStatus: BankQrCheckStatus.NEEDS_REVIEW,
  qrCheckReason,
});

describe("matchQrPayloadAgainstTypedDetails", () => {
  it("matches when the name and account number are both on the QR", () => {
    const payload = parseEmvPayload(buildBankQrPayload({ accountName: "SHRESTHA SABIN" }));

    expect(matchQrPayloadAgainstTypedDetails(payload, typedDetails)).toEqual({
      isRejected: false,
      qrCheckStatus: BankQrCheckStatus.MATCHED,
      qrCheckReason: null,
    });
  });

  it("accepts an account number written with spaces or dashes on the QR", () => {
    const payload = parseEmvPayload(buildBankQrPayload({ accountNumber: "1234-5678 90" }));

    expect(matchQrPayloadAgainstTypedDetails(payload, typedDetails).isRejected).toBe(false);
    expect(matchQrPayloadAgainstTypedDetails(payload, typedDetails)).toMatchObject({
      qrCheckStatus: BankQrCheckStatus.MATCHED,
    });
  });

  it("sends a QR that is not a payment QR to review", () => {
    expect(matchQrPayloadAgainstTypedDetails(null, typedDetails)).toEqual(
      needsReview(BankQrCheckReason.NOT_PAYMENT_QR),
    );
  });

  it("sends a QR with a broken checksum to review, even if its fields contradict", () => {
    const payload = parseEmvPayload(breakChecksum(buildBankQrPayload({ accountNumber: "999" })));

    expect(
      matchQrPayloadAgainstTypedDetails(payload, typedDetails, confirmedTestBankFields),
    ).toEqual(needsReview(BankQrCheckReason.INVALID_CHECKSUM));
  });

  it("sends a QR with no name to review", () => {
    const payload = parseEmvPayload(buildBankQrPayload({ accountName: null }));

    expect(matchQrPayloadAgainstTypedDetails(payload, typedDetails)).toEqual(
      needsReview(BankQrCheckReason.NAME_NOT_FOUND),
    );
  });

  it("sends a QR with a different name to review instead of rejecting it", () => {
    const payload = parseEmvPayload(buildBankQrPayload({ accountName: "Sabin Trading Pvt Ltd" }));

    expect(matchQrPayloadAgainstTypedDetails(payload, typedDetails)).toEqual(
      needsReview(BankQrCheckReason.NAME_DIFFERS),
    );
  });

  it("sends a QR without the typed account number to review when the field is not confirmed", () => {
    const payload = parseEmvPayload(buildBankQrPayload({ accountNumber: "5555555555" }));

    expect(matchQrPayloadAgainstTypedDetails(payload, typedDetails)).toEqual(
      needsReview(BankQrCheckReason.ACCOUNT_NUMBER_NOT_FOUND),
    );
  });

  it("does not count the operator id as an account number", () => {
    const payload = parseEmvPayload(
      buildBankQrPayload({ operatorGuid: "1234567890", accountNumber: "5555555555" }),
    );

    expect(matchQrPayloadAgainstTypedDetails(payload, typedDetails)).toEqual(
      needsReview(BankQrCheckReason.ACCOUNT_NUMBER_NOT_FOUND),
    );
  });

  it("rejects a confirmed account number field that differs from the typed number", () => {
    const payload = parseEmvPayload(buildBankQrPayload({ accountNumber: "1234567899" }));

    expect(
      matchQrPayloadAgainstTypedDetails(payload, typedDetails, confirmedTestBankFields),
    ).toEqual({ isRejected: true, rejection: BANK_QR_REJECTION.ACCOUNT_NUMBER_CONTRADICTS_QR });
  });

  it("rejects a confirmed bank code field that differs from the picked bank", () => {
    const payload = parseEmvPayload(buildBankQrPayload({ bankCode: "A08" }));

    expect(
      matchQrPayloadAgainstTypedDetails(payload, typedDetails, confirmedTestBankFields),
    ).toEqual({ isRejected: true, rejection: BANK_QR_REJECTION.BANK_CONTRADICTS_QR });
  });

  it("matches when confirmed fields agree, ignoring bank code case", () => {
    const payload = parseEmvPayload(buildBankQrPayload({ bankCode: "a03" }));

    expect(
      matchQrPayloadAgainstTypedDetails(payload, typedDetails, confirmedTestBankFields),
    ).toMatchObject({ isRejected: false, qrCheckStatus: BankQrCheckStatus.MATCHED });
  });

  it("ignores confirmed fields from a different operator", () => {
    const payload = parseEmvPayload(
      buildBankQrPayload({ operatorGuid: "np.com.otherbank", accountNumber: "1234567899" }),
    );

    expect(
      matchQrPayloadAgainstTypedDetails(payload, typedDetails, confirmedTestBankFields),
    ).toEqual(needsReview(BankQrCheckReason.ACCOUNT_NUMBER_NOT_FOUND));
  });

  it("never rejects with the shipped field map, which has no confirmed fields yet", () => {
    const payload = parseEmvPayload(buildBankQrPayload({ accountNumber: "1234567899" }));

    expect(matchQrPayloadAgainstTypedDetails(payload, typedDetails).isRejected).toBe(false);
  });
});

describe("findConfirmedAccountNumber", () => {
  it("reads the account number from a confirmed field", () => {
    const payload = parseEmvPayload(buildBankQrPayload({ accountNumber: "1234 567 890" }));

    expect(payload && findConfirmedAccountNumber(payload, confirmedTestBankFields)).toBe(
      "1234567890",
    );
  });

  it("returns null when no field is confirmed", () => {
    const payload = parseEmvPayload(buildBankQrPayload());

    expect(payload && findConfirmedAccountNumber(payload)).toBeNull();
  });
});
