import { describe, expect, it } from "vitest";

import { buildAccountJsonQrPayload } from "#test/bank-qr-test-codes.js";

import { parseAccountJsonPayload } from "./bank-qr-verification.account-json-parser.js";

describe("parseAccountJsonPayload", () => {
  it("reads the holder name, account number and bank code from a bank account QR", () => {
    expect(
      parseAccountJsonPayload(
        buildAccountJsonQrPayload({
          accountName: "ANJESH GHIMIRE",
          accountNumber: "00107010000001",
          bankCode: "GLBBNPKA",
        }),
      ),
    ).toEqual({
      accountName: "ANJESH GHIMIRE",
      accountNumber: "00107010000001",
      bankSwiftCode: "GLBBNPKA",
    });
  });

  it("reads a QR without a bank code", () => {
    expect(parseAccountJsonPayload(buildAccountJsonQrPayload({ bankCode: null }))).toMatchObject({
      bankSwiftCode: null,
    });
  });

  it("trims spaces around the values and the text", () => {
    expect(
      parseAccountJsonPayload(`  {"accountName":" RAM SHARMA ","accountNumber":" 123456 "}\n`),
    ).toEqual({ accountName: "RAM SHARMA", accountNumber: "123456", bankSwiftCode: null });
  });

  it.each([
    ["plain text", "hello"],
    ["an EMV payload", "000201010211"],
    ["JSON without an account number", '{"accountName":"Ram Sharma"}'],
    ["JSON with an empty account name", '{"accountName":" ","accountNumber":"123456"}'],
    ["JSON with a number instead of text", '{"accountName":"Ram","accountNumber":123456}'],
    ["a JSON list", '["Ram","123456"]'],
    ["JSON null", "null"],
  ])("returns null for %s", (_description, qrText) => {
    expect(parseAccountJsonPayload(qrText)).toBeNull();
  });
});
