import { describe, expect, it } from "vitest";

import {
  BankAccountVerificationMethod,
  BankQrCheckReason,
  BankQrCheckStatus,
} from "#generated/prisma/enums.js";

import { toBankAccountQrCheckFields } from "./bank-qr-verification.utils.js";

const CHECKED_AT = new Date("2026-10-12T08:00:00.000Z");

describe("toBankAccountQrCheckFields", () => {
  it("verifies the account by qr match when the qr matched", () => {
    expect(
      toBankAccountQrCheckFields(
        { qrCheckStatus: BankQrCheckStatus.MATCHED, qrCheckReason: null },
        CHECKED_AT,
      ),
    ).toEqual({
      qrCheckStatus: BankQrCheckStatus.MATCHED,
      qrCheckReason: null,
      qrCheckedAt: CHECKED_AT,
      isVerified: true,
      verifiedAt: CHECKED_AT,
      verificationMethod: BankAccountVerificationMethod.QR_MATCH,
    });
  });

  it("leaves the account unverified when it needs review", () => {
    expect(
      toBankAccountQrCheckFields(
        {
          qrCheckStatus: BankQrCheckStatus.NEEDS_REVIEW,
          qrCheckReason: BankQrCheckReason.NAME_DIFFERS,
        },
        CHECKED_AT,
      ),
    ).toEqual({
      qrCheckStatus: BankQrCheckStatus.NEEDS_REVIEW,
      qrCheckReason: BankQrCheckReason.NAME_DIFFERS,
      qrCheckedAt: CHECKED_AT,
      isVerified: false,
      verifiedAt: null,
      verificationMethod: null,
    });
  });
});
