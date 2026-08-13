import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Badge, Button } from "@outfiqe/design-system";
import { brandApplicationsApi } from "./api";
import { useInfiniteBrandApplications } from "./hooks/useInfiniteBrandApplications";
import type { BrandApplicationStatusValue } from "./schemas";

const TABS: BrandApplicationStatusValue[] = ["PENDING", "APPROVED", "REJECTED"];

const STATUS_TONE: Record<BrandApplicationStatusValue, "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  APPROVED: "positive",
  REJECTED: "negative",
};

export function BrandApplicationsPage() {
  const [tab, setTab] = useState<BrandApplicationStatusValue>("PENDING");
  const queryClient = useQueryClient();

  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteBrandApplications(tab);
  const applications = data?.pages.flatMap((page) => page.applications) ?? [];

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
            {status[0]}
            {status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load applications.</p>}
        {!isLoading && applications.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {applications.map((app) => (
          <div key={app.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-foreground">
                    {app.brandName}
                  </h2>
                  <Badge tone={STATUS_TONE[app.status]} showDot={false}>
                    {app.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {app.contactName} &middot; {app.categories.join(", ")} &middot;{" "}
                  {app.makesOwnPieces}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {app.email || "No email on file"} &middot; {app.phone} &middot; {app.instagram}
                </p>
              </div>

              {app.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => approve.mutate(app.id)}
                    disabled={approve.isPending || reject.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReject(app.id)}
                    disabled={approve.isPending || reject.isPending}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

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
}
