import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  Skeleton,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";

import { crmRelationshipsApi } from "./relationshipsApi";
import type { PartnerSummary } from "./relationshipsSchemas";

const PARTNER_SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const PARTNER_SEARCH_PAGE_SIZE = 20;

export type SelectedPartner = Pick<PartnerSummary, "creatorId" | "name" | "handle">;

type PartnerSearchFieldProps = {
  id: string;
  value: SelectedPartner | null;
  onChange: (partner: SelectedPartner | null) => void;
};

const describePartner = (partner: SelectedPartner) => `${partner.name} (@${partner.handle})`;

export const PartnerSearchField = ({ id, value, onChange }: PartnerSearchFieldProps) => {
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const query = typedQuery ?? (value ? describePartner(value) : "");

  const debouncedQuery = useDebouncedValue(query, PARTNER_SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const { data: page, isLoading } = useQuery({
    queryKey: ["crm-partner-search", debouncedQuery],
    queryFn: () =>
      crmRelationshipsApi.listPartners({
        q: debouncedQuery.trim(),
        pageSize: PARTNER_SEARCH_PAGE_SIZE,
      }),
    enabled: isSearching,
  });
  const partners = page?.items ?? [];

  const selectPartner = (creatorId: string) => {
    const partner = partners.find((candidate) => candidate.creatorId === creatorId);
    if (!partner) return;
    setTypedQuery(null);
    onChange({ creatorId: partner.creatorId, name: partner.name, handle: partner.handle });
  };

  const clearPartner = () => {
    setTypedQuery(null);
    onChange(null);
  };

  return (
    <Autocomplete>
      <div className="relative">
        <AutocompleteInput
          id={id}
          placeholder="Search partners by name or @handle…"
          value={query}
          onChange={(event) => setTypedQuery(event.target.value)}
          onBlur={() => setTypedQuery(null)}
          className="pr-8"
        />
        {value && (
          <button
            type="button"
            onClick={clearPartner}
            aria-label="Clear selected partner"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {isSearching && (
        <AutocompleteContent className="mt-2">
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="mx-1.5 my-1 h-7 rounded-md" />
            ))}

          {!isLoading && partners.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No partners found for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {partners.map((partner) => (
            <AutocompleteItem
              key={partner.creatorId}
              value={partner.creatorId}
              onSelect={() => selectPartner(partner.creatorId)}
            >
              <span className="truncate text-[13px] text-foreground">{partner.name}</span>
              <span className="ml-1.5 shrink-0 text-[12px] text-muted-foreground">
                @{partner.handle}
              </span>
            </AutocompleteItem>
          ))}
        </AutocompleteContent>
      )}
    </Autocomplete>
  );
};
