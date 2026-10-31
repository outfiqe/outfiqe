import { Button, FormBanner, Input } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { formatDateTime } from "@outfiqe/utils";
import { useId, useState } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";
import { rawTextFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { usePlatformAuditFilterOptions, usePlatformAuditLog } from "../api/platformAuditApi";
import type { PlatformAuditEntry, PlatformAuditFilter } from "../api/platformAuditSchemas";
import { toPlainAuditLabel } from "../utils/auditLabels.utils";
import { AuditFilterPicker } from "./AuditFilterPicker";

const SKELETON_ROW_COUNT = 5;
const NO_ENTRIES = 0;
const METADATA_INDENT = 2;
const NO_METADATA_KEYS = 0;
const ITEM_ID_DEBOUNCE_MS = 300;

const toCodeChoice = (code: string) => ({ value: code, label: toPlainAuditLabel(code) });

const AuditEntryRow = ({ entry }: { entry: PlatformAuditEntry }) => {
  const hasMetadata = Object.keys(entry.metadata).length > NO_METADATA_KEYS;
  return (
    <li className="space-y-1 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">{entry.summary}</p>
      <p className="text-xs text-muted-foreground">
        {entry.actorName ?? entry.actorUserId}
        {entry.onBehalfOfName ? ` (acting as ${entry.onBehalfOfName})` : ""} ·{" "}
        {formatDateTime(entry.createdAt)} · {toPlainAuditLabel(entry.action)}
      </p>
      {entry.targetType && (
        <p className="text-xs text-muted-foreground">
          {toPlainAuditLabel(entry.targetType)} {entry.targetId}
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
  const itemIdFieldId = useId();
  const [action, setAction] = useSearchFilter("action", rawTextFilter);
  const [targetType, setTargetType] = useSearchFilter("itemType", rawTextFilter);
  const [actorUserId, setActorUserId] = useSearchFilter("who", rawTextFilter);
  const [itemIdText, setItemIdText] = useState("");
  const itemId = useDebouncedValue(itemIdText, ITEM_ID_DEBOUNCE_MS).trim();

  const filter: PlatformAuditFilter = {
    action: action || undefined,
    targetType: targetType || undefined,
    actorUserId: actorUserId || undefined,
    targetId: itemId || undefined,
  };

  const filterOptions = usePlatformAuditFilterOptions();
  const auditLog = usePlatformAuditLog(filter);
  const entries = auditLog.data?.pages.flatMap((auditPage) => auditPage.items) ?? [];
  const areChoicesLoading = filterOptions.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every change platform staff made: settings, switches, builds, offers, commission tiers,
          moderation and retried jobs.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <AuditFilterPicker
          label="What happened"
          placeholder="Search actions"
          choices={filterOptions.data?.actions.map(toCodeChoice) ?? []}
          selectedValue={action}
          isLoading={areChoicesLoading}
          onSelect={setAction}
        />
        <AuditFilterPicker
          label="Who did it"
          placeholder="Search staff"
          choices={
            filterOptions.data?.actors.map(({ id, name }) => ({ value: id, label: name })) ?? []
          }
          selectedValue={actorUserId}
          isLoading={areChoicesLoading}
          onSelect={setActorUserId}
        />
        <AuditFilterPicker
          label="What it affected"
          placeholder="Search item types"
          choices={filterOptions.data?.targetTypes.map(toCodeChoice) ?? []}
          selectedValue={targetType}
          isLoading={areChoicesLoading}
          onSelect={setTargetType}
        />
        <div className="w-full space-y-1 sm:w-64">
          <label htmlFor={itemIdFieldId} className="text-xs text-muted-foreground">
            Item ID (optional)
          </label>
          <Input
            id={itemIdFieldId}
            value={itemIdText}
            placeholder="Paste an exact ID"
            onChange={(event) => setItemIdText(event.target.value)}
          />
        </div>
      </div>

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
