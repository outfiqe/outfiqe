import {
  Badge,
  Button,
  DateInput,
  FilterChip,
  FormBanner,
  Table,
  type TableColumn,
} from "@outfiqe/design-system";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AuditFilterPicker } from "@/components/AuditFilterPicker";
import { TableSkeleton } from "@/components/TableSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";
import { oneOfFilter, rawTextFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { toDayRange } from "../../activities/utils/taskDue.utils";
import { CrmPageHeader } from "../../components/CrmPageHeader";
import { CsvExportButton } from "../../components/CsvExportButton";
import { AUDIT_TABLE_HEADERS, CRM_PAGE_TEXT } from "../../constants/crmPageContent";
import { useCrmCsvExport } from "../../hooks/useCrmCsvExport";
import { formatDateTime } from "../../utils/format.utils";
import { crmAuditApi } from "../api/auditApi";
import { AUDIT_GROUPS } from "../constants/auditLabels";
import {
  type AuditLogRow,
  groupRepeatedEntries,
  toAuditActionLabel,
  toAuditSummary,
} from "../utils/auditEntries.utils";
import { AuditEntryPanel } from "./AuditEntryPanel";

const AUDIT_QUERY_KEY = ["crm-audit"];
const AUDIT_FILTERS_QUERY_KEY = ["crm-audit-filters"];
const EXPORT_FILE_NAME = "audit-log.csv";
const EXPORT_FAILURE_MESSAGE = "Couldn't export the log. Try a shorter date range.";
const SINGLE_OCCURRENCE = 1;
const AUDIT_GROUP_FILTER = oneOfFilter(
  AUDIT_GROUPS.map(({ value }) => value),
  "",
);

const AUDIT_COLUMNS: TableColumn<AuditLogRow>[] = [
  { key: "when", header: "When", render: ({ createdAt }) => formatDateTime(createdAt) },
  { key: "who", header: "Who", render: ({ actorName }) => actorName ?? "System" },
  {
    key: "action",
    header: "Action",
    render: ({ action, outcome, occurrenceCount }) => (
      <span className="flex flex-wrap items-center gap-2">
        {toAuditActionLabel(action)}
        {outcome === "FAILURE" && <Badge tone="negative">failed</Badge>}
        {occurrenceCount > SINGLE_OCCURRENCE && <Badge>{occurrenceCount} times</Badge>}
      </span>
    ),
  },
  { key: "details", header: "Details", render: ({ summary }) => toAuditSummary(summary) },
];

export const AuditPage = () => {
  const [group, setGroup] = useSearchFilter("group", AUDIT_GROUP_FILTER);
  const [action, setAction] = useSearchFilter("action", rawTextFilter);
  const [actorUserId, setActorUserId] = useSearchFilter("who", rawTextFilter);
  const [dateFrom, setDateFrom] = useSearchFilter("from", rawTextFilter);
  const [dateTo, setDateTo] = useSearchFilter("to", rawTextFilter);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogRow | null>(null);

  const auditFilters = {
    group: group || undefined,
    action: action || undefined,
    actorUserId: actorUserId || undefined,
    from: toDayRange(dateFrom, "start"),
    to: toDayRange(dateTo, "end"),
  };
  const hasFilters = Boolean(group || action || actorUserId || dateFrom || dateTo);

  const { data: filterOptions, isLoading: areChoicesLoading } = useQuery({
    queryKey: AUDIT_FILTERS_QUERY_KEY,
    queryFn: crmAuditApi.listFilterOptions,
  });
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: [...AUDIT_QUERY_KEY, auditFilters],
      queryFn: ({ pageParam }) => crmAuditApi.list(auditFilters, pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });
  const { exportCsv, isExporting } = useCrmCsvExport(
    () => crmAuditApi.exportLog(auditFilters),
    EXPORT_FILE_NAME,
    EXPORT_FAILURE_MESSAGE,
  );

  const rows = groupRepeatedEntries(data?.pages.flatMap((page) => page.entries) ?? []);

  return (
    <div>
      <CrmPageHeader
        {...CRM_PAGE_TEXT.audit}
        actions={<CsvExportButton isExporting={isExporting} onExport={() => void exportCsv()} />}
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {AUDIT_GROUPS.map(({ value, label }) => (
          <FilterChip key={label} isSelected={group === value} onClick={() => setGroup(value)}>
            {label}
          </FilterChip>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <AuditFilterPicker
          label="What happened"
          placeholder="Search actions"
          choices={
            filterOptions?.actions.map((code) => ({
              value: code,
              label: toAuditActionLabel(code),
            })) ?? []
          }
          selectedValue={action}
          isLoading={areChoicesLoading}
          onSelect={setAction}
        />
        <AuditFilterPicker
          label="Who did it"
          placeholder="Search your team"
          choices={filterOptions?.actors.map(({ id, name }) => ({ value: id, label: name })) ?? []}
          selectedValue={actorUserId}
          isLoading={areChoicesLoading}
          onSelect={setActorUserId}
        />
        <DateInput
          aria-label="From date"
          max={dateTo}
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="w-40"
        />
        <DateInput
          aria-label="To date"
          min={dateFrom}
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="w-40"
        />
      </div>

      <div className="mt-6">
        {isLoading && <TableSkeleton headers={AUDIT_TABLE_HEADERS} />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}

        {data && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "Nothing matches these filters."
              : "No audit entries yet. Team, role and billing changes will appear here."}
          </p>
        )}

        {rows.length > 0 && (
          <Table
            caption="Audit log"
            columns={AUDIT_COLUMNS}
            rows={rows}
            rowKey={({ id }) => id}
            onRowClick={setSelectedEntry}
          />
        )}

        {hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            isLoading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            Load more
          </Button>
        )}
      </div>

      {selectedEntry && (
        <AuditEntryPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
};
