import { Badge, Button, FormBanner } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { JOBS_HEALTH_QUERY_KEY, platformJobsApi } from "./api";

const REFRESH_INTERVAL_MS = 15_000;
const SKELETON_ROW_COUNT = 3;
const NOTHING_FAILED = 0;
const NOTHING_STUCK = 0;

export const JobsHealthPage = () => {
  const health = useQuery({
    queryKey: JOBS_HEALTH_QUERY_KEY,
    queryFn: platformJobsApi.getHealth,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
  const retryEvent = useApiMutation({
    successMessage: "The event will be sent again.",
    mutationFn: platformJobsApi.retryOutboxEvent,
    invalidateKeys: [JOBS_HEALTH_QUERY_KEY],
  });
  const retryQueue = useApiMutation({
    successMessage: (retriedCount: number) => `Sent ${retriedCount} failed jobs again.`,
    mutationFn: platformJobsApi.retryFailedJobs,
    invalidateKeys: [JOBS_HEALTH_QUERY_KEY],
  });
  const mutationError = retryEvent.error ?? retryQueue.error;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Jobs & health</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Background work behind live boards, notifications and stock alerts. Refreshes every 15
          seconds.
        </p>
      </div>

      {health.isLoading &&
        Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <CardRowSkeleton key={index} textLineCount={2} />
        ))}
      {health.error && <FormBanner>{getErrorMessage(health.error)}</FormBanner>}
      {mutationError && <FormBanner>{getErrorMessage(mutationError)}</FormBanner>}

      {health.data && (
        <>
          <section aria-label="Events waiting to be sent" className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Waiting to be sent</p>
              <p className="font-display text-2xl font-bold text-foreground">
                {health.data.outbox.unpublishedCount}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Oldest waiting since</p>
              <p className="text-sm font-medium text-foreground">
                {health.data.outbox.oldestUnpublishedAt
                  ? new Date(health.data.outbox.oldestUnpublishedAt).toLocaleString()
                  : "Nothing waiting"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Stuck after every retry</p>
              <p className="font-display text-2xl font-bold text-foreground">
                {health.data.outbox.stuckCount}
              </p>
            </div>
          </section>

          <section aria-labelledby="queues-heading" className="space-y-3">
            <h2 id="queues-heading" className="font-display text-lg font-bold text-foreground">
              Queues
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {health.data.queues.map((queue) => (
                <li
                  key={queue.name}
                  className="space-y-2 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{queue.name}</p>
                    <Badge tone={queue.isReachable ? "positive" : "negative"} showDot={false}>
                      {queue.isReachable ? "Reachable" : "Can't be reached"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {queue.waiting} waiting · {queue.active} running · {queue.delayed} delayed ·{" "}
                    {queue.failed} failed
                  </p>
                  {queue.failed > NOTHING_FAILED && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={retryQueue.isPending}
                      onClick={() => retryQueue.mutate(queue.name)}
                    >
                      Retry failed jobs
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="stuck-heading" className="space-y-3">
            <h2 id="stuck-heading" className="font-display text-lg font-bold text-foreground">
              Stuck events
            </h2>
            {health.data.stuckEvents.length === NOTHING_STUCK && (
              <p className="text-sm text-muted-foreground">No events are stuck.</p>
            )}
            <ul className="space-y-3">
              {health.data.stuckEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{event.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()} · {event.attempts} tries
                    </p>
                    {event.lastError && (
                      <p className="mt-1 break-words text-xs text-destructive">{event.lastError}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={retryEvent.isPending}
                    onClick={() => retryEvent.mutate(event.id)}
                  >
                    Send again
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
};
