import { describe, expect, it } from "vitest";

import { BANK_QR_PREVIEW_NOTES } from "../constants/bankQrMessages";
import { describeBankQrPreview, pickBankQrPrefills } from "./bankQrPrefill.utils";

const emptyFields = { accountName: "", accountNumber: "", confirmAccountNumber: "" };

describe("pickBankQrPrefills", () => {
  it("fills every empty field the QR has a value for", () => {
    expect(
      pickBankQrPrefills(emptyFields, {
        isQrDetected: true,
        accountName: "SABIN SHRESTHA",
        accountNumber: "1234567890",
      }),
    ).toEqual({
      accountName: "SABIN SHRESTHA",
      accountNumber: "1234567890",
      confirmAccountNumber: "1234567890",
    });
  });

  it("never overwrites something the person already typed", () => {
    expect(
      pickBankQrPrefills(
        { accountName: "Sabin Shrestha", accountNumber: "111111", confirmAccountNumber: " " },
        { isQrDetected: true, accountName: "SABIN SHRESTHA", accountNumber: "1234567890" },
      ),
    ).toEqual({ confirmAccountNumber: "1234567890" });
  });

  it("fills nothing when the QR has no details", () => {
    expect(
      pickBankQrPrefills(emptyFields, {
        isQrDetected: true,
        accountName: null,
        accountNumber: null,
      }),
    ).toEqual({});
  });
});

describe("describeBankQrPreview", () => {
  it("says when no QR code was found", () => {
    expect(
      describeBankQrPreview({ isQrDetected: false, accountName: null, accountNumber: null }),
    ).toBe(BANK_QR_PREVIEW_NOTES.NO_QR_FOUND);
  });

  it("says when details were read from the QR", () => {
    expect(
      describeBankQrPreview({ isQrDetected: true, accountName: "Sabin", accountNumber: null }),
    ).toBe(BANK_QR_PREVIEW_NOTES.DETAILS_FILLED);
  });

  it("says when a QR was found but its details couldn't be read", () => {
    expect(
      describeBankQrPreview({ isQrDetected: true, accountName: null, accountNumber: null }),
    ).toBe(BANK_QR_PREVIEW_NOTES.DETAILS_UNREADABLE);
  });
});
