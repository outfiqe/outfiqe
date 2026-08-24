import { Badge, Button, toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiClientError } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessages";

import { withdrawRequestsApi } from "./api";
import { useInfiniteWithdrawRequests } from "./hooks/useInfiniteWithdrawRequests";
import type { WithdrawRequestStatusValue } from "./schemas";

const TABS: WithdrawRequestStatusValue[] = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "PAID",
  "REJECTED",
];

const STATUS_TONE: Record<WithdrawRequestStatusValue, "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  UNDER_REVIEW: "neutral",
  APPROVED: "positive",
  PAID: "positive",
  REJECTED: "negative",
};

const OWNER_TYPE_LABEL: Record<string, string> = {
  CREATOR: "Creator",
  BUSINESS: "Business",
};

const CROSS_CHECK_CONFIRM_MESSAGE =
  "This is the first payout to this bank account. Confirm the identity/bank-name cross-check to approve it.";

export const WithdrawRequestsListSection = () => {
  const [tab, setTab] = useState<WithdrawRequestStatusValue>("PENDING");
  const queryClient = useQueryClient();

  const {
    data: requestsQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteWithdrawRequests(tab);
  const requests = requestsQuery?.pages.flatMap((page) => page.items) ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["withdraw-requests"] });

  const approve = useMutation({
    mutationFn: ({
      id,
      identityCrossCheckConfirmed,
    }: {
      id: string;
      identityCrossCheckConfirmed?: boolean;
    }) => withdrawRequestsApi.approve(id, identityCrossCheckConfirmed),
    onSuccess: invalidate,
    onError: (mutationError, variables) => {
      if (
        mutationError instanceof ApiClientError &&
        mutationError.code === "IDENTITY_CROSS_CHECK_REQUIRED"
      ) {
        if (window.confirm(CROSS_CHECK_CONFIRM_MESSAGE)) {
          approve.mutate({ id: variables.id, identityCrossCheckConfirmed: true });
        }
        return;
      }
      toast.error(getErrorMessage(mutationError));
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      withdrawRequestsApi.reject(id, reason),
    onSuccess: invalidate,
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const markPaid = useMutation({
    mutationFn: ({ id, referenceNote }: { id: string; referenceNote: string }) =>
      withdrawRequestsApi.markPaid(id, referenceNote),
    onSuccess: invalidate,
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const isActing = approve.isPending || reject.isPending || markPaid.isPending;

  const handleReject = (id: string) => {
    const reason = window.prompt("Reason for rejecting this request:");
    if (reason) reject.mutate({ id, reason });
  };

  const handleMarkPaid = (id: string) => {
    const referenceNote = window.prompt("Payment reference (transaction id, note):");
    if (referenceNote) markPaid.mutate({ id, referenceNote });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((status) => (
          <button
            key={status}
            onClick={() => setTab(status)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === status
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {status.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load requests.</p>}
        {!isLoading && requests.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {requests.map((request) => {
          const {
            id,
            ownerType,
            ownerName,
            bankAccountLast4,
            amount,
            status,
            rejectionReason,
            referenceNote,
            requiresSecondSignOff,
            firstApprovedById,
            createdAt,
          } = request;

          return (
            <div
              key={id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {OWNER_TYPE_LABEL[ownerType]}: {ownerName}
                  </h3>
                  <Badge tone={STATUS_TONE[status]} showDot={false}>
                    {status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rs. {amount.toLocaleString()} · Bank account •••• {bankAccountLast4} ·{" "}
                  {new Date(createdAt).toLocaleDateString()}
                </p>
                {status === "UNDER_REVIEW" && requiresSecondSignOff && (
                  <p className="mt-1 text-sm text-amber-700">
                    {firstApprovedById
                      ? "Signed off once — needs a different admin to approve."
                      : "Above the standard limit — needs sign-off from two admins."}
                  </p>
                )}
                {status === "REJECTED" && rejectionReason && (
                  <p className="mt-1 text-sm text-destructive">Reason: {rejectionReason}</p>
                )}
                {status === "PAID" && referenceNote && (
                  <p className="mt-1 text-sm text-muted-foreground">Reference: {referenceNote}</p>
                )}
              </div>

              <div className="flex gap-2">
                {(status === "PENDING" || status === "UNDER_REVIEW") && (
                  <>
                    <Button size="sm" onClick={() => approve.mutate({ id })} disabled={isActing}>
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(id)}
                      disabled={isActing}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {status === "APPROVED" && (
                  <Button size="sm" onClick={() => handleMarkPaid(id)} disabled={isActing}>
                    Mark paid
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-auto"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>
    </div>
  );
};
