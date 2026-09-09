import { Badge, Button, Skeleton } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiClientError } from "@/lib/apiClient";

import { tagReportsApi } from "./api";
import { useInfiniteTagReports } from "./hooks/useInfiniteTagReports";
import { ResolveReportModal } from "./ResolveReportModal";
import type { ResolveTagReportInput, TagReport, TagReportStatusValue } from "./schemas";

const TABS: TagReportStatusValue[] = ["OPEN", "ACTIONED", "DISMISSED"];

const TAB_LABEL: Record<TagReportStatusValue, string> = {
  OPEN: "Open",
  ACTIONED: "Actioned",
  DISMISSED: "Dismissed",
};

const REASON_LABEL: Record<TagReport["reason"], string> = {
  COUNTERFEIT: "Counterfeit",
  NOT_GENUINELY_WORN: "Not genuinely worn",
  MISLEADING: "Misleading",
  OFFENSIVE: "Offensive",
  OTHER: "Other",
};

const SOURCE_LABEL: Record<TagReport["source"], string> = {
  PUBLIC_REPORT: "Reported by a viewer",
  BRAND_COUNTERFEIT_REJECTION: "Brand flagged as counterfeit",
};

const errorText = (error: unknown, fallback: string): string =>
  error instanceof ApiClientError ? error.message : fallback;

export const TagReportsPage = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TagReportStatusValue>("OPEN");
  const [resolving, setResolving] = useState<TagReport | null>(null);

  const openCount = useQuery({
    queryKey: ["tag-reports", "open-count"],
    queryFn: tagReportsApi.openCount,
  });

  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteTagReports(tab);
  const reports = data?.pages.flatMap((page) => page.items) ?? [];

  const resolve = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolveTagReportInput }) =>
      tagReportsApi.resolve(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-reports"] });
      setResolving(null);
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Tag reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Counterfeit and misleading-tag reports from viewers and brands.
        {openCount.data ? ` ${openCount.data} open.` : ""}
      </p>

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
            {TAB_LABEL[status]}
            {status === "OPEN" && openCount.data ? ` (${openCount.data})` : ""}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load tag reports.</p>}
        {!isLoading && !error && reports.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {reports.map((report) => {
          const { tag } = report;
          return (
            <div key={report.id} className="flex gap-4 rounded-xl border border-border bg-card p-4">
              <div
                className="size-20 shrink-0 rounded-lg bg-muted bg-cover bg-center"
                style={{ backgroundImage: `url(${tag.lookImageUrl})` }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{tag.product.name}</span>
                  <Badge showDot={false} tone="neutral">
                    {tag.product.brandName}
                  </Badge>
                  <Badge
                    showDot={false}
                    tone={report.reason === "COUNTERFEIT" ? "negative" : "neutral"}
                  >
                    {REASON_LABEL[report.reason]}
                  </Badge>
                  {tag.creator.counterfeitFlagCount > 0 && (
                    <Badge showDot={false} tone="negative">
                      {tag.creator.counterfeitFlagCount} counterfeit flag
                      {tag.creator.counterfeitFlagCount === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tagged by @{tag.creator.handle} · {SOURCE_LABEL[report.source]}
                  {report.reporterName ? ` (${report.reporterName})` : ""} · tag is{" "}
                  {tag.reviewStatus.toLowerCase()}
                </p>
                {report.note && (
                  <p className="mt-1.5 text-sm text-foreground">&ldquo;{report.note}&rdquo;</p>
                )}
                {report.status !== "OPEN" && report.resolutionNote && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Resolution: {report.resolutionNote}
                  </p>
                )}

                {report.status === "OPEN" && (
                  <Button variant="outline" onClick={() => setResolving(report)} className="mt-2.5">
                    Resolve
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

      {resolving && (
        <ResolveReportModal
          report={resolving}
          isPending={resolve.isPending}
          errorMessage={
            resolve.isError ? errorText(resolve.error, "Couldn't resolve this report.") : null
          }
          onConfirm={(input) => resolve.mutate({ id: resolving.id, input })}
          onCancel={() => setResolving(null)}
        />
      )}
    </div>
  );
};
