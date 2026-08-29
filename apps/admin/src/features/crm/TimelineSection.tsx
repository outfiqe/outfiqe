import { Button, FormBanner, Select, Skeleton } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmActivitiesApi } from "./activitiesApi";
import {
  CRM_ACTIVITY_TYPES,
  type CrmActivityTypeValue,
  type CrmSubjectTypeValue,
  type TimelineEntry,
} from "./activitiesSchemas";
import { formatDateTime, formatRupees } from "./format.utils";

const isActivityType = (value: string): value is CrmActivityTypeValue =>
  (CRM_ACTIVITY_TYPES as readonly string[]).includes(value);

const toActivityType = (value: string): CrmActivityTypeValue =>
  isActivityType(value) ? value : "NOTE";

const entryLine = (entry: TimelineEntry): string =>
  entry.kind === "activity"
    ? `${entry.activityType.toLowerCase()}${entry.authorName ? ` · ${entry.authorName}` : ""} — ${entry.body}`
    : `order ${entry.orderId.slice(0, 8)} · ${entry.itemCount} item${entry.itemCount === 1 ? "" : "s"} · ${formatRupees(entry.amount)} · ${entry.paymentStatus.toLowerCase()} / ${entry.fulfilmentStatus.toLowerCase()}`;

type TimelineSectionProps = {
  subjectType: CrmSubjectTypeValue;
  subjectId: string;
};

export const TimelineSection = ({ subjectType, subjectId }: TimelineSectionProps) => {
  const queryClient = useQueryClient();
  const subject = { subjectType, subjectId };
  const queryKey = ["crm-timeline", subjectType, subjectId];

  const {
    data: timeline,
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => crmActivitiesApi.getTimeline(subject),
  });

  const [activityType, setActivityType] = useState<CrmActivityTypeValue>("NOTE");
  const [body, setBody] = useState("");

  const logActivity = useMutation({
    mutationFn: () =>
      crmActivitiesApi.logActivity(subject, { type: activityType, body: body.trim() }),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (body.trim().length > 0) logActivity.mutate();
  };

  return (
    <section>
      <h2 className="font-display text-base font-bold text-foreground">Timeline</h2>

      <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2">
        <Select
          aria-label="Activity type"
          value={activityType}
          onChange={(event) => setActivityType(toActivityType(event.target.value))}
          className="w-32"
        >
          {CRM_ACTIVITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.toLowerCase()}
            </option>
          ))}
        </Select>
        <input
          aria-label="Activity note"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Log a note, call, message or email…"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground"
        />
        <Button
          type="submit"
          size="sm"
          disabled={body.trim().length === 0 || logActivity.isPending}
        >
          {logActivity.isPending ? "Saving…" : "Log"}
        </Button>
      </form>

      {logActivity.isError && (
        <FormBanner className="mt-2">{getErrorMessage(logActivity.error)}</FormBanner>
      )}

      <div className="mt-4">
        {isLoading && <Skeleton className="h-32 w-full" />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}

        {timeline && timeline.partial && (
          <FormBanner tone="neutral">
            Showing logged activity only — live order history is temporarily unavailable.
          </FormBanner>
        )}

        {timeline && timeline.entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}

        {timeline && timeline.entries.length > 0 && (
          <ul className="space-y-2 text-sm">
            {timeline.entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <span>{entryLine(entry)}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(entry.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
