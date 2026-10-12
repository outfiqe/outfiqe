import { describe, expect, it } from "vitest";

import { buildAccountJsonQrPayload, buildBankQrPayload } from "#test/bank-qr-test-codes.js";

import { BANK_QR_FORMAT } from "./bank-qr-verification.constants.js";
import { readBankQr } from "./bank-qr-verification.reader.js";

describe("readBankQr", () => {
  it("reads an EMV payment QR", () => {
    expect(readBankQr(buildBankQrPayload())?.format).toBe(BANK_QR_FORMAT.EMV);
  });

  it("reads a bank account JSON QR", () => {
    expect(readBankQr(buildAccountJsonQrPayload())).toEqual({
      format: BANK_QR_FORMAT.ACCOUNT_JSON,
      accountDetails: {
        accountName: "SABIN SHRESTHA",
        accountNumber: "1234567890",
        bankSwiftCode: "NARBNPKA",
      },
    });
  });

  it("returns null for any other QR", () => {
    expect(readBankQr("https://example.com/pay")).toBeNull();
  });
});
