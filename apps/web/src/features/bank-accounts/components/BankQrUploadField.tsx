"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  ImageUploader,
} from "@outfiqe/design-system";
import type { UseFormReturn } from "react-hook-form";

import { uploadsApi } from "@/shared/api/uploadsApi";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { AddBankAccountInput } from "../api/bankAccountSchemas";
import { BANK_QR_PREVIEW_NOTES } from "../constants/bankQrMessages";
import { usePreviewBankQr } from "../hooks/usePreviewBankQr";
import { describeBankQrPreview, pickBankQrPrefills } from "../utils/bankQrPrefill.utils";

type BankQrUploadFieldProps = {
  form: UseFormReturn<AddBankAccountInput>;
};

const PREFILL_OPTIONS = { shouldValidate: true, shouldDirty: true } as const;

export const BankQrUploadField = ({ form }: BankQrUploadFieldProps) => {
  const previewBankQr = usePreviewBankQr();

  const prefillFromUploadedQr = async (qrCodeImageUrl: string) => {
    previewBankQr.reset();
    if (!qrCodeImageUrl) return;

    const preview = await previewBankQr.mutateAsync(qrCodeImageUrl).catch(() => null);
    if (!preview) return;

    const { accountName, accountNumber, confirmAccountNumber } = pickBankQrPrefills(
      form.getValues(),
      preview,
    );
    if (accountName) form.setValue("accountName", accountName, PREFILL_OPTIONS);
    if (accountNumber) form.setValue("accountNumber", accountNumber, PREFILL_OPTIONS);
    if (confirmAccountNumber) {
      form.setValue("confirmAccountNumber", confirmAccountNumber, PREFILL_OPTIONS);
    }
  };

  const previewNote = previewBankQr.isPending
    ? BANK_QR_PREVIEW_NOTES.READING
    : previewBankQr.data && describeBankQrPreview(previewBankQr.data);

  return (
    <FormField
      control={form.control}
      name="qrCodeImageUrl"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Bank QR code</FormLabel>
          <p className="mb-1.5 text-xs text-muted-foreground">
            A photo or screenshot of your bank&apos;s QR code. If it matches the details below, your
            account is verified straight away.
          </p>
          <FormControl>
            <ImageUploader
              value={field.value ? [field.value] : []}
              onChange={(urls) => {
                const qrCodeImageUrl = urls[0] ?? "";
                field.onChange(qrCodeImageUrl);
                void prefillFromUploadedQr(qrCodeImageUrl);
              }}
              onUpload={(files) => uploadsApi.upload(files)}
              maxFiles={1}
              describeUploadError={getErrorMessage}
            />
          </FormControl>
          {previewNote && (
            <p role="status" className="mt-1.5 text-xs text-muted-foreground">
              {previewNote}
            </p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
