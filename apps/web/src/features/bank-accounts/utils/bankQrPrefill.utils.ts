import type { AddBankAccountInput, BankQrPreview } from "../api/bankAccountSchemas";
import { BANK_QR_PREVIEW_NOTES } from "../constants/bankQrMessages";

type PrefillableBankAccountFields = Pick<
  AddBankAccountInput,
  "accountName" | "accountNumber" | "confirmAccountNumber"
>;

const isBlank = (fieldValue: string): boolean => fieldValue.trim().length === 0;

export const pickBankQrPrefills = (
  currentValues: PrefillableBankAccountFields,
  { accountName, accountNumber }: BankQrPreview,
): Partial<PrefillableBankAccountFields> => ({
  ...(accountName && isBlank(currentValues.accountName) ? { accountName } : {}),
  ...(accountNumber && isBlank(currentValues.accountNumber) ? { accountNumber } : {}),
  ...(accountNumber && isBlank(currentValues.confirmAccountNumber)
    ? { confirmAccountNumber: accountNumber }
    : {}),
});

export const describeBankQrPreview = ({
  isQrDetected,
  accountName,
  accountNumber,
}: BankQrPreview): string => {
  if (!isQrDetected) return BANK_QR_PREVIEW_NOTES.NO_QR_FOUND;
  return accountName || accountNumber
    ? BANK_QR_PREVIEW_NOTES.DETAILS_FILLED
    : BANK_QR_PREVIEW_NOTES.DETAILS_UNREADABLE;
};
