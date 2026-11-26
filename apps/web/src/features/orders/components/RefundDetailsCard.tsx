"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { extractFieldIssueMessages } from "@outfiqe/client";
import {
  Button,
  Checkbox,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
} from "@outfiqe/design-system";
import { RefundDestinationKind } from "@outfiqe/types";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useNepalBanks } from "@/features/nepal-banks";
import type { ApiClientError } from "@/shared/lib/apiClient";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import {
  isRefundFormFieldName,
  NO_BANK_CHOSEN,
  refundDetailsFormSchema,
  type RefundDetailsFormValues,
  toSaveRefundDestinationBody,
} from "../api/refundDetailsFormSchema";
import type { MyRefundDestination } from "../api/refundSchemas";
import {
  REFUND_DETAILS_HEADING_ID,
  REFUND_DETAILS_SECTION_ID,
} from "../constants/refundDetailsSection";
import { REFUND_DESTINATION_KIND_LABELS } from "../constants/refundLabels";
import { useSaveRefundDestination } from "../hooks/useSaveRefundDestination";
import { isRefundDestinationKind } from "../utils/refundDestination.utils";

type RefundDetailsCardProps = {
  orderId: string;
  refundDestination: MyRefundDestination;
};

const NO_WALLET_ID = "";
const NO_ACCOUNT_NUMBER = "";

const describeSavedDestination = ({
  kind,
  walletId,
  bankName,
  accountNumberLast4,
}: NonNullable<MyRefundDestination["destination"]>) =>
  kind === RefundDestinationKind.BANK
    ? `${bankName ?? "Bank"} account ending ${accountNumberLast4 ?? ""}`
    : `${REFUND_DESTINATION_KIND_LABELS[kind]} ${walletId ?? ""}`;

export const RefundDetailsCard = ({ orderId, refundDestination }: RefundDetailsCardProps) => {
  const { amountAwaitingDetails, canEdit, destination } = refundDestination;
  const saveDestination = useSaveRefundDestination(orderId);
  const { data: banks } = useNepalBanks();
  const [isEditing, setIsEditing] = useState(destination === null);
  const form = useForm<RefundDetailsFormValues>({
    resolver: zodResolver(refundDetailsFormSchema),
    defaultValues: {
      kind: destination?.kind ?? refundDestination.suggestedKind ?? RefundDestinationKind.KHALTI,
      walletId: destination?.walletId ?? NO_WALLET_ID,
      bankId: destination?.bankId ?? NO_BANK_CHOSEN,
      accountNumber: NO_ACCOUNT_NUMBER,
      accountName: destination?.accountName ?? refundDestination.suggestedAccountName,
      confirmsOwnership: false,
    },
  });
  const kind = form.watch("kind");
  const confirmsOwnership = form.watch("confirmsOwnership");
  const isBank = kind === RefundDestinationKind.BANK;

  const showSaveFailure = (error: ApiClientError) => {
    const messagesByField = extractFieldIssueMessages(error.details);
    const fieldNames = Object.keys(messagesByField).filter(isRefundFormFieldName);
    for (const fieldName of fieldNames) {
      form.setError(fieldName, { message: messagesByField[fieldName] });
    }
    if (fieldNames.length === 0) form.setError("root", { message: getErrorMessage(error) });
  };

  const submitRefundDetails = form.handleSubmit((values) => {
    form.clearErrors("root");
    saveDestination.mutate(toSaveRefundDestinationBody(values), {
      onSuccess: () => setIsEditing(false),
      onError: showSaveFailure,
    });
  });

  return (
    <section
      id={REFUND_DETAILS_SECTION_ID}
      aria-labelledby={REFUND_DETAILS_HEADING_ID}
      className="mt-4 rounded-2xl border border-border p-5"
    >
      <h2
        id={REFUND_DETAILS_HEADING_ID}
        tabIndex={-1}
        className="font-display text-base font-extrabold text-foreground"
      >
        {canEdit
          ? `Where should we send your Rs. ${amountAwaitingDetails.toLocaleString()} refund?`
          : "Refund account"}
      </h2>

      {!isEditing && destination && (
        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
          <span className="text-foreground">{describeSavedDestination(destination)}</span>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              Change
            </Button>
          )}
        </div>
      )}

      {isEditing && canEdit && (
        <Form {...form}>
          <form onSubmit={submitRefundDetails} noValidate className="mt-3 space-y-3">
            {form.formState.errors.root && (
              <FormBanner>{form.formState.errors.root.message}</FormBanner>
            )}
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Send it to</FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      onChange={(event) => {
                        if (isRefundDestinationKind(event.target.value)) {
                          field.onChange(event.target.value);
                        }
                      }}
                    >
                      {Object.values(RefundDestinationKind).map((destinationKind) => (
                        <option key={destinationKind} value={destinationKind}>
                          {REFUND_DESTINATION_KIND_LABELS[destinationKind]}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            {isBank ? (
              <>
                <FormField
                  control={form.control}
                  name="bankId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          <option value={NO_BANK_CHOSEN}>Choose your bank</option>
                          {banks?.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.name}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account number</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <FormField
                control={form.control}
                name="walletId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{REFUND_DESTINATION_KIND_LABELS[kind]} ID (mobile number)</FormLabel>
                    <FormControl>
                      <Input inputMode="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account holder name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={confirmsOwnership}
                onChange={(event) => form.setValue("confirmsOwnership", event.target.checked)}
              />
              This account is mine
            </label>

            <Button
              type="submit"
              disabled={!confirmsOwnership}
              isLoading={saveDestination.isPending}
            >
              Send refund details
            </Button>
          </form>
        </Form>
      )}
    </section>
  );
};
