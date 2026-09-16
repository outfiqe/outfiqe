import { Badge, Button, Skeleton } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiClientError } from "@/lib/apiClient";
import { oneOfFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { contentReportsApi } from "./api";
import { useInfiniteContentReports } from "./hooks/useInfiniteContentReports";
import { ResolveContentReportModal } from "./ResolveContentReportModal";
import type { ContentReport, ContentReportStatusValue, ResolveContentReportInput } from "./schemas";

const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";

const TABS: ContentReportStatusValue[] = ["OPEN", "ACTIONED", "DISMISSED"];
const CONTENT_REPORTS_STATUS_FILTER = oneOfFilter<ContentReportStatusValue>(TABS, "OPEN");

const TAB_LABEL: Record<ContentReportStatusValue, string> = {
  OPEN: "Open",
  ACTIONED: "Actioned",
  DISMISSED: "Dismissed",
};

const REASON_LABEL: Record<ContentReport["reason"], string> = {
  SPAM: "Spam",
  HARASSMENT_OR_BULLYING: "Harassment or bullying",
  HATE_SPEECH: "Hate speech",
  NUDITY_OR_SEXUAL_CONTENT: "Nudity or sexual content",
  VIOLENCE_OR_DANGEROUS_ACTS: "Violence or dangerous acts",
  SCAM_OR_MISLEADING: "Scam or misleading",
  INTELLECTUAL_PROPERTY: "Intellectual property",
  OTHER: "Other",
};

const errorText = (error: unknown, fallback: string): string =>
  error instanceof ApiClientError ? error.message : fallback;

export const ContentReportsPage = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useSearchFilter("status", CONTENT_REPORTS_STATUS_FILTER);
  const [resolving, setResolving] = useState<ContentReport | null>(null);

  const openCount = useQuery({
    queryKey: ["content-reports", "open-count"],
    queryFn: contentReportsApi.openCount,
  });

  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteContentReports(tab);
  const reports = data?.pages.flatMap((page) => page.items) ?? [];

  const resolve = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolveContentReportInput }) =>
      contentReportsApi.resolve(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-reports"] });
      setResolving(null);
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Content reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Posts and comments flagged by viewers.
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
        {error && <p className="text-sm text-destructive">Couldn&apos;t load content reports.</p>}
        {!isLoading && !error && reports.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {reports.map((report) => {
          const { target } = report;
          const targetNoun = report.targetType === "CREATOR_LOOK" ? "post" : "comment";
          return (
            <div key={report.id} className="flex gap-4 rounded-xl border border-border bg-card p-4">
              {target?.imageUrl && (
                <div
                  className="size-20 shrink-0 rounded-lg bg-muted bg-cover bg-center"
                  style={{ backgroundImage: `url(${target.imageUrl})` }}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    showDot={false}
                    tone={
                      report.reason === "HATE_SPEECH" || report.reason === "HARASSMENT_OR_BULLYING"
                        ? "negative"
                        : "neutral"
                    }
                  >
                    {REASON_LABEL[report.reason]}
                  </Badge>
                  <Badge showDot={false} tone="neutral">
                    Reported {targetNoun}
                  </Badge>
                  {target && target.isRemoved && (
                    <Badge showDot={false} tone="neutral">
                      Already removed
                    </Badge>
                  )}
                  {target && target.author.contentFlagCount > 0 && (
                    <Badge showDot={false} tone="negative">
                      {target.author.contentFlagCount} prior removal
                      {target.author.contentFlagCount === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
                {target ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    By @{target.author.handle}
                    {report.reporterName ? ` · Reported by ${report.reporterName}` : ""}
                    {" · "}
                    <a
                      href={`${WEB_URL}/creator/${target.author.handle}?look=${target.lookId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      View {targetNoun}
                    </a>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    This {targetNoun} no longer exists.
                  </p>
                )}
                {target?.snippet && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-foreground">
                    &ldquo;{target.snippet}&rdquo;
                  </p>
                )}
                {report.note && (
                  <p className="mt-1.5 text-sm text-foreground">
                    Reporter note: &ldquo;{report.note}&rdquo;
                  </p>
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
            isLoading={isFetchingNextPage}
            className="mx-auto"
          >
            Load more
          </Button>
        )}
      </div>

      {resolving && (
        <ResolveContentReportModal
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
