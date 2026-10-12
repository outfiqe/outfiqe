import { Button, FormBanner, Input } from "@outfiqe/design-system";
import { type FormEvent, useId, useState } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { usePlatformAuditLog } from "../api/platformAuditApi";
import type { PlatformAuditEntry, PlatformAuditFilter } from "../api/platformAuditSchemas";

const SKELETON_ROW_COUNT = 5;
const NO_ENTRIES = 0;
const METADATA_INDENT = 2;
const NO_METADATA_KEYS = 0;

const toOptionalFilter = (text: string): string | undefined => {
  const trimmedText = text.trim();
  return trimmedText === "" ? undefined : trimmedText;
};

const AuditEntryRow = ({ entry }: { entry: PlatformAuditEntry }) => {
  const hasMetadata = Object.keys(entry.metadata).length > NO_METADATA_KEYS;
  return (
    <li className="space-y-1 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">{entry.summary}</p>
      <p className="text-xs text-muted-foreground">
        {entry.actorName ?? entry.actorUserId}
        {entry.onBehalfOfName ? ` (acting as ${entry.onBehalfOfName})` : ""} ·{" "}
        {new Date(entry.createdAt).toLocaleString()} · {entry.action}
      </p>
      {entry.targetType && (
        <p className="text-xs text-muted-foreground">
          {entry.targetType} {entry.targetId}
        </p>
      )}
      {hasMetadata && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Details</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-2">
            {JSON.stringify(entry.metadata, null, METADATA_INDENT)}
          </pre>
        </details>
      )}
    </li>
  );
};

export const PlatformAuditPage = () => {
  const actionFieldId = useId();
  const targetTypeFieldId = useId();
  const targetIdFieldId = useId();
  const [actionText, setActionText] = useState("");
  const [targetTypeText, setTargetTypeText] = useState("");
  const [targetIdText, setTargetIdText] = useState("");
  const [filter, setFilter] = useState<PlatformAuditFilter>({});
  const auditLog = usePlatformAuditLog(filter);
  const entries = auditLog.data?.pages.flatMap((page) => page.items) ?? [];

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilter({
      action: toOptionalFilter(actionText),
      targetType: toOptionalFilter(targetTypeText),
      targetId: toOptionalFilter(targetIdText),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every change platform staff made: settings, switches, builds, offers, commission tiers,
          moderation and retried jobs.
        </p>
      </div>

      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor={actionFieldId} className="text-xs text-muted-foreground">
            Action
          </label>
          <Input
            id={actionFieldId}
            value={actionText}
            placeholder="outfit-build.archived-by-admin"
            onChange={(event) => setActionText(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={targetTypeFieldId} className="text-xs text-muted-foreground">
            Target type
          </label>
          <Input
            id={targetTypeFieldId}
            value={targetTypeText}
            placeholder="Outfit"
            onChange={(event) => setTargetTypeText(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={targetIdFieldId} className="text-xs text-muted-foreground">
            Target ID
          </label>
          <Input
            id={targetIdFieldId}
            value={targetIdText}
            onChange={(event) => setTargetIdText(event.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {auditLog.isLoading &&
        Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <CardRowSkeleton key={index} textLineCount={2} />
        ))}
      {auditLog.error && <FormBanner>{getErrorMessage(auditLog.error)}</FormBanner>}
      {!auditLog.isLoading && !auditLog.error && entries.length === NO_ENTRIES && (
        <p className="text-sm text-muted-foreground">Nothing matches these filters.</p>
      )}
      <ul className="space-y-3">
        {entries.map((entry) => (
          <AuditEntryRow key={entry.id} entry={entry} />
        ))}
      </ul>
      {auditLog.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void auditLog.fetchNextPage()}
          isLoading={auditLog.isFetchingNextPage}
        >
          Load more
        </Button>
      )}
    </div>
  );
};
