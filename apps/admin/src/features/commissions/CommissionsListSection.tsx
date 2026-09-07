import { Badge, Button, toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { TextPromptModal } from "@/components/TextPromptModal";
import { getErrorMessage } from "@/lib/errorMessages";

import { commissionsApi } from "./api";
import { useInfiniteCommissions } from "./hooks/useInfiniteCommissions";
import type { CommissionStatusValue } from "./schemas";

const TABS: CommissionStatusValue[] = ["PENDING", "APPROVED", "AVAILABLE", "PAID", "VOIDED"];

const STATUS_TONE: Record<CommissionStatusValue, "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  APPROVED: "positive",
  AVAILABLE: "positive",
  PAID: "positive",
  VOIDED: "negative",
};

const SOURCE_LABEL: Record<string, string> = {
  TAG_CLICK: "Tagged post",
  INTERNAL_LINK: "Creator link",
  EXTERNAL_LINK: "Shared link",
};

export const CommissionsListSection = () => {
  const [tab, setTab] = useState<CommissionStatusValue>("PENDING");
  const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: commissionsQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteCommissions(tab);
  const commissions = commissionsQuery?.pages.flatMap((page) => page.items) ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["commissions"] });

  const approve = useMutation({
    mutationFn: (id: string) => commissionsApi.approve(id),
    onSuccess: invalidate,
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const voidCommission = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => commissionsApi.void(id, reason),
    onSuccess: () => {
      invalidate();
      setVoidTargetId(null);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => commissionsApi.markPaid(id),
    onSuccess: invalidate,
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const isActing = approve.isPending || voidCommission.isPending || markPaid.isPending;

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Creator commissions</h2>

      <div className="mt-4 flex flex-wrap gap-2">
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
            {status}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load commissions.</p>}
        {!isLoading && commissions.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {commissions.map((commission) => {
          const { id, creatorName, productName, brandName, source, status, amount, createdAt } =
            commission;

          return (
            <div
              key={id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {creatorName}
                  </h3>
                  <Badge tone={STATUS_TONE[status]} showDot={false}>
                    {status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {productName} · {brandName} · {SOURCE_LABEL[source]}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rs. {amount.toLocaleString()} · {new Date(createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                {status === "PENDING" && (
                  <Button size="sm" onClick={() => approve.mutate(id)} disabled={isActing}>
                    Approve
                  </Button>
                )}
                {status === "AVAILABLE" && (
                  <Button size="sm" onClick={() => markPaid.mutate(id)} disabled={isActing}>
                    Mark paid
                  </Button>
                )}
                {(status === "PENDING" || status === "APPROVED" || status === "AVAILABLE") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVoidTargetId(id)}
                    disabled={isActing}
                  >
                    Void
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

      <TextPromptModal
        open={voidTargetId !== null}
        title="Void commission"
        label="Reason for voiding this commission"
        confirmLabel="Void"
        pendingLabel="Voiding…"
        isPending={voidCommission.isPending}
        onConfirm={(reason) => {
          if (voidTargetId) voidCommission.mutate({ id: voidTargetId, reason });
        }}
        onCancel={() => setVoidTargetId(null)}
      />
    </div>
  );
};
