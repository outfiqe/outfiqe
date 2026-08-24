"use client";

import { Button, Skeleton } from "@outfiqe/design-system";

import { BankAccountsList, useBankAccounts } from "@/features/bank-accounts";

import type { OwnerTypeValue } from "../api/withdrawSchemas";
import { useMyWithdrawRequests } from "../hooks/useMyWithdrawRequests";
import { useWithdrawEligibility } from "../hooks/useWithdrawEligibility";
import { useWithdrawPolicy } from "../hooks/useWithdrawPolicy";
import { WithdrawPolicyPanel } from "./WithdrawPolicyPanel";
import { WithdrawRequestForm } from "./WithdrawRequestForm";
import { WithdrawRequestRow } from "./WithdrawRequestRow";

type WithdrawSectionProps = {
  ownerType: OwnerTypeValue;
  title: string;
  description: string;
};

export const WithdrawSection = ({ ownerType, title, description }: WithdrawSectionProps) => {
  const { data: policy, isPending: isPolicyPending } = useWithdrawPolicy(ownerType);
  const { data: eligibility, isPending: isEligibilityPending } = useWithdrawEligibility(ownerType);
  const { data: bankAccounts } = useBankAccounts(ownerType);
  const { data, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useMyWithdrawRequests(ownerType);
  const requests = data?.pages.flatMap((page) => page.items) ?? [];
  const verifiedBankAccounts = (bankAccounts ?? []).filter((bankAccount) => bankAccount.isVerified);

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mt-6">
        <WithdrawPolicyPanel
          policy={policy}
          eligibility={eligibility}
          isLoading={isPolicyPending || isEligibilityPending}
        />
      </div>

      <div className="mt-6">
        <BankAccountsList ownerType={ownerType} />
      </div>

      <div className="mt-6 rounded-2xl border border-border p-5">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-foreground">
          Request a withdrawal
        </h2>
        {isEligibilityPending ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : (
          eligibility && (
            <WithdrawRequestForm
              ownerType={ownerType}
              verifiedBankAccounts={verifiedBankAccounts}
              eligibility={eligibility}
            />
          )
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-foreground">
          History
        </h2>

        {isPending && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!isPending && requests.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>
          </div>
        )}

        {requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((request) => (
              <WithdrawRequestRow key={request.id} request={request} />
            ))}
          </div>
        )}

        {hasNextPage && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
