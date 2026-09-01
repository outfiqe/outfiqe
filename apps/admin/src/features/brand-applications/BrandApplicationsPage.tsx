import { Badge, Button } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiClientError } from "@/lib/apiClient";

import { brandApplicationsApi } from "./api";
import { useInfiniteBrandApplications } from "./hooks/useInfiniteBrandApplications";
import type { BrandApplicationStatusValue } from "./schemas";

const TABS: BrandApplicationStatusValue[] = ["PENDING", "APPROVED", "REJECTED"];

const STATUS_TONE: Record<BrandApplicationStatusValue, "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  APPROVED: "positive",
  REJECTED: "negative",
};

const STATUS_LABEL: Record<BrandApplicationStatusValue, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const BrandApplicationsPage = () => {
  const [tab, setTab] = useState<BrandApplicationStatusValue>("PENDING");
  const queryClient = useQueryClient();

  const {
    data: applicationsQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteBrandApplications(tab);
  const applications = applicationsQuery?.pages.flatMap((page) => page.applications) ?? [];

  const approve = useMutation({
    mutationFn: (id: string) => brandApplicationsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand-applications"] }),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      brandApplicationsApi.reject(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand-applications"] }),
  });

  const handleReject = (id: string) => {
    const reason = window.prompt("Reason for rejecting (optional):") ?? undefined;
    reject.mutate({ id, reason: reason || undefined });
  };

  const actionErrorFor = (applicationId: string): string | null => {
    if (approve.isError && approve.variables === applicationId) {
      return approve.error instanceof ApiClientError
        ? approve.error.message
        : "Couldn't approve this application. Try again.";
    }
    if (reject.isError && reject.variables?.id === applicationId) {
      return reject.error instanceof ApiClientError
        ? reject.error.message
        : "Couldn't reject this application. Try again.";
    }
    return null;
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Brand applications</h1>

      <div className="mt-5 flex gap-2">
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
            {STATUS_LABEL[status]}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load applications.</p>}
        {!isLoading && applications.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {applications.map((application) => {
          const { id, brandName, status, contactName, makesOwnPieces, email, phone, instagram } =
            application;

          const summaryLine = [contactName, makesOwnPieces].filter(Boolean).join(" · ");
          const actionError = actionErrorFor(id);

          return (
            <div key={id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-bold text-foreground">
                      {brandName}
                    </h2>
                    <Badge tone={STATUS_TONE[status]} showDot={false}>
                      {STATUS_LABEL[status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{summaryLine}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {email || "No email on file"} &middot; {phone} &middot; {instagram}
                  </p>
                </div>

                {status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => approve.mutate(id)}
                      disabled={approve.isPending || reject.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(id)}
                      disabled={approve.isPending || reject.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              {actionError && <p className="mt-3 text-sm text-destructive">{actionError}</p>}
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
