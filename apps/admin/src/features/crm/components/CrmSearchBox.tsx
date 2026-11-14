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

import { DEFAULT_SKELETON_ROW_COUNT } from "@/lib/skeletons";

import { crmApi } from "../api/crmApi";
import { STAGE_LABELS } from "../contacts/constants/contactLabels";
import { crmReportingApi } from "../reporting/api/reportingApi";
import type { CrmSearchResults } from "../reporting/api/reportingSchemas";
import { toPlainWords } from "../utils/format.utils";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const SEARCH_READ_PERMISSION_KEYS = [
  "accounts:read",
  "customers:read",
  "deals:read",
  "tickets:read",
  "contacts:read",
];

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
  goToDeal: (dealId: string) => void,
  goToTicket: (ticketId: string) => void,
  goToContact: (contactId: string) => void,
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
    groupLabel: "Opportunities",
    primary: deal.title,
    secondary: `${deal.stageName} · ${toPlainWords(deal.status)}`,
    navigate: () => goToDeal(deal.id),
  })),
  ...results.tickets.map((ticket) => ({
    key: `ticket:${ticket.id}`,
    groupLabel: "Tickets",
    primary: ticket.title,
    secondary: `${toPlainWords(ticket.type)} · ${toPlainWords(ticket.status)}`,
    navigate: () => goToTicket(ticket.id),
  })),
  ...results.contacts.map((contact) => ({
    key: `contact:${contact.id}`,
    groupLabel: "Contacts",
    primary: contact.name,
    secondary: contact.company ?? STAGE_LABELS[contact.lifecycleStage] ?? "",
    navigate: () => goToContact(contact.id),
  })),
];

export const CrmSearchBox = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const isSearching = trimmedQuery.length >= MIN_QUERY_LENGTH;

  const { data: organization } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
  });
  const canSearch =
    organization !== undefined &&
    (organization.viewerIsSuperAdmin ||
      SEARCH_READ_PERMISSION_KEYS.some((key) => organization.viewerPermissionKeys.includes(key)));

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
        (dealId) => navigate({ to: "/crm/pipeline/$dealId", params: { dealId } }),
        (ticketId) => navigate({ to: "/crm/support/$ticketId", params: { ticketId } }),
        (contactId) => navigate({ to: "/crm/contacts/$contactId", params: { contactId } }),
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
        placeholder="Search people, sales and tickets…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full min-w-0 max-w-72"
      />

      {isSearching && (
        <AutocompleteContent className="mt-2 w-[min(20rem,calc(100vw-2rem))]">
          {isLoading &&
            Array.from({ length: DEFAULT_SKELETON_ROW_COUNT }).map((_, index) => (
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
