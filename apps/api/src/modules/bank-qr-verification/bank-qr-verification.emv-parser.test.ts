import { describe, expect, it } from "vitest";

import {
  breakChecksum,
  buildBankQrPayload,
  TEST_ACCOUNT_NUMBER_SUB_TAG,
  TEST_BANK_QR_OPERATOR_GUID,
  TEST_NEPALPAY_TEMPLATE_TAG,
} from "#test/bank-qr-test-codes.js";

import { EMV_OPERATOR_GUID_SUB_TAG } from "./bank-qr-verification.constants.js";
import { computeCrc16Ccitt, parseEmvPayload } from "./bank-qr-verification.emv-parser.js";

describe("computeCrc16Ccitt", () => {
  it("matches the CRC-16/CCITT-FALSE check value", () => {
    expect(computeCrc16Ccitt("123456789")).toBe("29B1");
  });

  it("pads short checksums to four hex characters", () => {
    expect(computeCrc16Ccitt("")).toBe("FFFF");
  });
});

describe("parseEmvPayload", () => {
  it("reads the name and the nested account template of a valid payload", () => {
    const parsed = parseEmvPayload(buildBankQrPayload({ accountNumber: "0012345678" }));

    expect(parsed?.merchantName).toBe("Sabin Shrestha");
    expect(parsed?.hasValidChecksum).toBe(true);
    expect(parsed?.merchantAccountTemplates).toHaveLength(1);

    const [accountTemplate] = parsed?.merchantAccountTemplates ?? [];
    expect(accountTemplate?.templateTag).toBe(TEST_NEPALPAY_TEMPLATE_TAG);
    expect(accountTemplate?.subFields.get(EMV_OPERATOR_GUID_SUB_TAG)).toBe(
      TEST_BANK_QR_OPERATOR_GUID,
    );
    expect(accountTemplate?.subFields.get(TEST_ACCOUNT_NUMBER_SUB_TAG)).toBe("0012345678");
  });

  it("ignores surrounding whitespace from the scanner", () => {
    expect(parseEmvPayload(`  ${buildBankQrPayload()}\n`)?.hasValidChecksum).toBe(true);
  });

  it("flags a payload whose checksum does not match", () => {
    expect(parseEmvPayload(breakChecksum(buildBankQrPayload()))?.hasValidChecksum).toBe(false);
  });

  it("flags a payload with no checksum field", () => {
    expect(parseEmvPayload("000201")?.hasValidChecksum).toBe(false);
  });

  it("returns no name when the name field is missing", () => {
    expect(parseEmvPayload(buildBankQrPayload({ accountName: null }))?.merchantName).toBeNull();
  });

  it("keeps a template with broken inner fields but gives it no sub fields", () => {
    const parsed = parseEmvPayload("000201" + "2903abc");

    expect(parsed?.merchantAccountTemplates[0]?.subFields.size).toBe(0);
  });

  it.each([
    ["plain text", "hello world"],
    ["a url", "https://example.com/pay"],
    ["a cut-off payload", buildBankQrPayload().slice(0, 20)],
    ["a payload that does not start with the format indicator", "0102115802NP"],
    ["a payload with the wrong format version", "000202"],
    ["an empty string", ""],
  ])("returns null for %s", (_description, qrText) => {
    expect(parseEmvPayload(qrText)).toBeNull();
  });
});
