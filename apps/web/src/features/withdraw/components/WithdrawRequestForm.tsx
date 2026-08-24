"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  toast,
} from "@outfiqe/design-system";
import { useForm } from "react-hook-form";

import type { BankAccount } from "@/features/bank-accounts";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import {
  type CreateWithdrawRequestInput,
  createWithdrawRequestSchema,
  type OwnerTypeValue,
  type WithdrawEligibility,
} from "../api/withdrawSchemas";
import { useCreateWithdrawRequest } from "../hooks/useCreateWithdrawRequest";

type WithdrawRequestFormProps = {
  ownerType: OwnerTypeValue;
  verifiedBankAccounts: BankAccount[];
  eligibility: WithdrawEligibility;
};

export const WithdrawRequestForm = ({
  ownerType,
  verifiedBankAccounts,
  eligibility,
}: WithdrawRequestFormProps) => {
  const createWithdrawRequest = useCreateWithdrawRequest(ownerType);

  const form = useForm<CreateWithdrawRequestInput>({
    resolver: zodResolver(createWithdrawRequestSchema),
    defaultValues: { bankAccountId: "", amount: eligibility.minAmount },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const succeeded = await createWithdrawRequest.mutateAsync(values).then(
      () => true,
      () => false,
    );
    if (!succeeded) return;

    toast.success("Withdrawal request submitted.");
    form.reset({ bankAccountId: values.bankAccountId, amount: eligibility.minAmount });
  });

  if (verifiedBankAccounts.length === 0) {
    return (
      <FormBanner tone="neutral">
        Add and verify a bank account above before requesting a withdrawal.
      </FormBanner>
    );
  }

  if (!eligibility.windowOpen) {
    return (
      <FormBanner tone="neutral">
        The withdrawal window isn&apos;t open right now. It opens{" "}
        {new Date(eligibility.nextWindowOpensAt).toLocaleDateString()}.
      </FormBanner>
    );
  }

  if (eligibility.cooldownActive) {
    return (
      <FormBanner tone="neutral">
        You&apos;re still in the cooldown period after a recent rejection.
      </FormBanner>
    );
  }

  if (eligibility.attemptsRemaining <= 0) {
    return (
      <FormBanner tone="neutral">
        You&apos;ve reached the withdrawal limit for this window.
      </FormBanner>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate>
        {createWithdrawRequest.isError && (
          <FormBanner className="mb-4">{getErrorMessage(createWithdrawRequest.error)}</FormBanner>
        )}

        <FormField
          control={form.control}
          name="bankAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank account</FormLabel>
              <FormControl>
                <Select {...field}>
                  <option value="">Select a bank account</option>
                  {verifiedBankAccounts.map((bankAccount) => (
                    <option key={bankAccount.id} value={bankAccount.id}>
                      {bankAccount.bankName} •••• {bankAccount.accountNumberLast4}
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
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (Rs.)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={eligibility.minAmount}
                  max={eligibility.availableBalance}
                  {...field}
                  onChange={(event) => field.onChange(event.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="mt-2 w-full" disabled={createWithdrawRequest.isPending}>
          {createWithdrawRequest.isPending ? "Submitting…" : "Request withdrawal"}
        </Button>
      </form>
    </Form>
  );
};
