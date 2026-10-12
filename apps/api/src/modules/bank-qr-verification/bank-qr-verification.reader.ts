import { parseAccountJsonPayload } from "./bank-qr-verification.account-json-parser.js";
import { BANK_QR_FORMAT } from "./bank-qr-verification.constants.js";
import { parseEmvPayload } from "./bank-qr-verification.emv-parser.js";
import type { ReadBankQr } from "./bank-qr-verification.types.js";

export const readBankQr = (qrText: string): ReadBankQr | null => {
  const emvPayload = parseEmvPayload(qrText);
  if (emvPayload) return { format: BANK_QR_FORMAT.EMV, emvPayload };

  const accountDetails = parseAccountJsonPayload(qrText);
  if (accountDetails) return { format: BANK_QR_FORMAT.ACCOUNT_JSON, accountDetails };

  return null;
};
