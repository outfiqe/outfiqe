import { Badge, Table, type TableColumn } from "@outfiqe/design-system";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown } from "lucide-react";
import type { ReactNode } from "react";

import type { TenantMetricRow, TenantSort } from "../api/platformMetricsSchemas";
import { toLastUsedLabel, toPlanLabel, toSubscriptionLabel } from "../utils/tenantMetrics.utils";

const SortableHeader = ({
  sortValue,
  activeSort,
  onSort,
  children,
}: {
  sortValue: TenantSort;
  activeSort: TenantSort;
  onSort: (sort: TenantSort) => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={sortValue === activeSort}
    onClick={() => onSort(sortValue)}
    className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
  >
    {children}
    {sortValue === activeSort && <ArrowDown className="size-3" aria-hidden />}
  </button>
);

const buildColumns = (
  activeSort: TenantSort,
  onSort: (sort: TenantSort) => void,
): TableColumn<TenantMetricRow>[] => {
  const sortableHeader = (sortValue: TenantSort, label: string) => (
    <SortableHeader sortValue={sortValue} activeSort={activeSort} onSort={onSort}>
      {label}
    </SortableHeader>
  );
  const countColumn = (
    key: string,
    sortValue: TenantSort,
    label: string,
    readCount: (row: TenantMetricRow) => number,
  ): TableColumn<TenantMetricRow> => ({
    key,
    header: sortableHeader(sortValue, label),
    align: "right",
    render: (row) => readCount(row).toLocaleString(),
  });

  return [
    {
      key: "business",
      header: sortableHeader("name", "Business"),
      render: ({ organizationId, name, subdomain, ownerName }) => (
        <div className="min-w-44">
          <Link
            to="/platform/metrics/$orgId"
            params={{ orgId: organizationId }}
            onClick={(event) => event.stopPropagation()}
            className="font-medium text-foreground hover:underline"
          >
            {name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {subdomain}
            {ownerName ? ` · ${ownerName}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: ({ plan, subscriptionStatus }) => {
        const statusLabel = toSubscriptionLabel(subscriptionStatus);
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {toPlanLabel(plan)}
            {statusLabel && (
              <Badge tone="neutral" showDot={false}>
                {statusLabel}
              </Badge>
            )}
          </div>
        );
      },
    },
    countColumn("members", "members", "Members", (row) => row.memberCount),
    countColumn("contacts", "contacts", "Contacts", (row) => row.contactCount),
    countColumn("deals", "deals", "Opportunities", (row) => row.dealCount),
    countColumn("tickets", "tickets", "Tickets", (row) => row.ticketCount),
    {
      key: "lastUsed",
      header: sortableHeader("recent-activity", "Last used"),
      render: ({ lastCrmActivityAt }) => toLastUsedLabel(lastCrmActivityAt),
    },
  ];
};

export const TenantTable = ({
  tenants,
  sort,
  onSort,
}: {
  tenants: TenantMetricRow[];
  sort: TenantSort;
  onSort: (sort: TenantSort) => void;
}) => {
  const navigate = useNavigate();

  return (
    <Table
      caption="Every business using the CRM"
      columns={buildColumns(sort, onSort)}
      rows={tenants}
      rowKey={({ organizationId }) => organizationId}
      onRowClick={({ organizationId }) =>
        void navigate({ to: "/platform/metrics/$orgId", params: { orgId: organizationId } })
      }
    />
  );
};
