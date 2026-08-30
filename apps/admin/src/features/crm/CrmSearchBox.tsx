import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  Skeleton,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { crmReportingApi } from "./reportingApi";
import type { CrmSearchResults } from "./reportingSchemas";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const SEARCH_READ_PERMISSION_KEYS = [
  "accounts:read",
  "customers:read",
  "deals:read",
  "tickets:read",
];

type CrmSearchBoxProps = {
  viewerIsSuperAdmin: boolean;
  viewerPermissionKeys: string[];
};

type ResultRow = {
  key: string;
  groupLabel: string;
  primary: string;
  secondary: string;
  navigate: () => void;
};

const buildRows = (
  results: CrmSearchResults,
  goToPartner: (creatorId: string) => void,
  goToCustomer: (userId: string) => void,
  goToPipeline: () => void,
  goToSupport: () => void,
): ResultRow[] => [
  ...results.partners.map((partner) => ({
    key: `partner:${partner.creatorId}`,
    groupLabel: "Partners",
    primary: partner.name,
    secondary: `@${partner.handle}`,
    navigate: () => goToPartner(partner.creatorId),
  })),
  ...results.customers.map((customer) => ({
    key: `customer:${customer.userId}`,
    groupLabel: "Customers",
    primary: customer.name,
    secondary: `@${customer.handle}`,
    navigate: () => goToCustomer(customer.userId),
  })),
  ...results.deals.map((deal) => ({
    key: `deal:${deal.id}`,
    groupLabel: "Deals",
    primary: deal.title,
    secondary: `${deal.stageName} · ${deal.status.toLowerCase()}`,
    navigate: goToPipeline,
  })),
  ...results.tickets.map((ticket) => ({
    key: `ticket:${ticket.id}`,
    groupLabel: "Tickets",
    primary: ticket.title,
    secondary: `${ticket.type.toLowerCase()} · ${ticket.status.replace("_", " ").toLowerCase()}`,
    navigate: goToSupport,
  })),
];

export const CrmSearchBox = ({ viewerIsSuperAdmin, viewerPermissionKeys }: CrmSearchBoxProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const isSearching = trimmedQuery.length >= MIN_QUERY_LENGTH;

  const canSearch =
    viewerIsSuperAdmin ||
    SEARCH_READ_PERMISSION_KEYS.some((key) => viewerPermissionKeys.includes(key));

  const { data: results, isLoading } = useQuery({
    queryKey: ["crm-search", trimmedQuery],
    queryFn: () => crmReportingApi.search(trimmedQuery),
    enabled: canSearch && isSearching,
  });

  if (!canSearch) return null;

  const rows = results
    ? buildRows(
        results,
        (creatorId) => navigate({ to: "/crm/partners/$creatorId", params: { creatorId } }),
        (userId) => navigate({ to: "/crm/customers/$userId", params: { userId } }),
        () => navigate({ to: "/crm/pipeline" }),
        () => navigate({ to: "/crm/support" }),
      )
    : [];

  const selectRow = (rowKey: string) => {
    const row = rows.find((candidate) => candidate.key === rowKey);
    if (!row) return;
    setQuery("");
    row.navigate();
  };

  return (
    <Autocomplete>
      <AutocompleteInput
        aria-label="Search the CRM"
        placeholder="Search partners, customers, deals, tickets…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-72"
      />

      {isSearching && (
        <AutocompleteContent className="mt-2 w-80">
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="mx-1.5 my-1 h-7 rounded-md" />
            ))}

          {!isLoading && rows.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No matches for &ldquo;{trimmedQuery}&rdquo;
            </p>
          )}

          {rows.map((row) => (
            <AutocompleteItem key={row.key} value={row.key} onSelect={() => selectRow(row.key)}>
              <span className="mr-2 shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                {row.groupLabel}
              </span>
              <span className="truncate text-[13px] text-foreground">{row.primary}</span>
              <span className="ml-1.5 shrink-0 text-[12px] text-muted-foreground">
                {row.secondary}
              </span>
            </AutocompleteItem>
          ))}
        </AutocompleteContent>
      )}
    </Autocomplete>
  );
};
