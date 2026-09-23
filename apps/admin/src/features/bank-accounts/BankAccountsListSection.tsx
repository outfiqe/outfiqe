import { Badge, Button, Select, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useState } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";
import { oneOfFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { bankAccountsAdminApi } from "./api";
import { useInfiniteBankAccounts } from "./hooks/useInfiniteBankAccounts";
import {
  ownerTypeSchema,
  type OwnerTypeValue,
  type RevealedBankAccount,
  VERIFIED_FILTER_VALUES,
  type VerifiedFilterValue,
} from "./schemas";

const OWNER_TABS: OwnerTypeValue[] = ownerTypeSchema.options;
const OWNER_TAB_LABEL: Record<OwnerTypeValue, string> = {
  CREATOR: "Creator",
  BUSINESS: "Business",
};
const VERIFIED_FILTER_LABEL: Record<VerifiedFilterValue, string> = {
  pending: "Pending",
  verified: "Verified",
};
const OWNER_TYPE_FILTER = oneOfFilter<OwnerTypeValue>(OWNER_TABS, "CREATOR");
const VERIFIED_TYPE_FILTER = oneOfFilter<VerifiedFilterValue>(VERIFIED_FILTER_VALUES, "pending");

export const BankAccountsListSection = () => {
  const [ownerType, setOwnerType] = useSearchFilter("owner", OWNER_TYPE_FILTER);
  const [verifiedFilter, setVerifiedFilter] = useSearchFilter("verified", VERIFIED_TYPE_FILTER);
  const [revealedById, setRevealedById] = useState<Record<string, RevealedBankAccount>>({});

  const {
    data: accountsQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteBankAccounts(ownerType, verifiedFilter);
  const accounts = accountsQuery?.pages.flatMap((page) => page.items) ?? [];

  const BANK_ACCOUNTS_QUERY_KEY = ["bank-accounts-admin", ownerType];

  const reveal = useApiMutation({
    mutationFn: (id: string) => bankAccountsAdminApi.reveal(ownerType, id),
    onSuccess: (revealed, id) => setRevealedById((current) => ({ ...current, [id]: revealed })),
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const verify = useApiMutation({
    successMessage: "Bank account verified.",
    mutationFn: (id: string) => bankAccountsAdminApi.verify(ownerType, id),
    invalidateKeys: [BANK_ACCOUNTS_QUERY_KEY],
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  return (
    <div>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Account type
          </span>
          <div className="flex gap-2">
            {OWNER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setOwnerType(tab)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  ownerType === tab
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {OWNER_TAB_LABEL[tab]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="bank-accounts-status-filter"
            className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Status
          </label>
          <Select
            id="bank-accounts-status-filter"
            className="h-9 w-40"
            value={verifiedFilter}
            onChange={(event) => setVerifiedFilter(event.target.value as VerifiedFilterValue)}
          >
            {VERIFIED_FILTER_VALUES.map((filter) => (
              <option key={filter} value={filter}>
                {VERIFIED_FILTER_LABEL[filter]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <CardRowSkeleton
              key={index}
              textLineCount={1}
              actions={[
                { label: "Reveal", size: "sm", variant: "outline" },
                { label: "Verify", size: "sm" },
              ]}
            />
          ))}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load bank accounts.</p>}
        {!isLoading && accounts.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {accounts.map((account) => {
          const {
            id,
            ownerName,
            bankName,
            accountName,
            accountNumberLast4,
            branchName,
            qrCodeImageUrl,
            isVerified,
            createdAt,
          } = account;
          const revealed = revealedById[id];

          return (
            <div key={id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-foreground">
                      {ownerName}
                    </h3>
                    <Badge tone={isVerified ? "positive" : "neutral"} showDot={false}>
                      {isVerified ? "Verified" : "Pending verification"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {bankName} •••• {revealed?.accountNumber ?? accountNumberLast4} · {accountName}{" "}
                    · {branchName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Added {new Date(createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reveal.mutate(id)}
                    disabled={reveal.isPending}
                    isLoading={reveal.isPending && reveal.variables === id}
                  >
                    {revealed ? "Refresh" : "Reveal"}
                  </Button>
                  {!isVerified && (
                    <Button
                      size="sm"
                      onClick={() => verify.mutate(id)}
                      disabled={verify.isPending}
                      isLoading={verify.isPending && verify.variables === id}
                    >
                      Verify
                    </Button>
                  )}
                </div>
              </div>

              {qrCodeImageUrl && (
                <a
                  href={qrCodeImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block"
                >
                  <img
                    src={qrCodeImageUrl}
                    alt={`${ownerName}'s bank QR code`}
                    className="size-32 rounded-lg border border-border object-cover"
                  />
                </a>
              )}
            </div>
          );
        })}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            isLoading={isFetchingNextPage}
            className="mx-auto"
          >
            Load more
          </Button>
        )}
      </div>
    </div>
  );
};
