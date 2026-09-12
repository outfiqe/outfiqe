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
import type { CustomerSummary } from "./relationshipsSchemas";

const CUSTOMER_SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const CUSTOMER_SEARCH_PAGE_SIZE = 20;

export type SelectedCustomer = Pick<CustomerSummary, "userId" | "name" | "handle">;

type CustomerSearchFieldProps = {
  id: string;
  value: SelectedCustomer | null;
  onChange: (customer: SelectedCustomer | null) => void;
};

const describeCustomer = (customer: SelectedCustomer) => `${customer.name} (@${customer.handle})`;

export const CustomerSearchField = ({ id, value, onChange }: CustomerSearchFieldProps) => {
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const query = typedQuery ?? (value ? describeCustomer(value) : "");

  const debouncedQuery = useDebouncedValue(query, CUSTOMER_SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const { data: page, isLoading } = useQuery({
    queryKey: ["crm-customer-search", debouncedQuery],
    queryFn: () =>
      crmRelationshipsApi.listCustomers({
        q: debouncedQuery.trim(),
        pageSize: CUSTOMER_SEARCH_PAGE_SIZE,
      }),
    enabled: isSearching,
  });
  const customers = page?.items ?? [];

  const selectCustomer = (userId: string) => {
    const customer = customers.find((candidate) => candidate.userId === userId);
    if (!customer) return;
    setTypedQuery(null);
    onChange({ userId: customer.userId, name: customer.name, handle: customer.handle });
  };

  const clearCustomer = () => {
    setTypedQuery(null);
    onChange(null);
  };

  return (
    <Autocomplete>
      <div className="relative">
        <AutocompleteInput
          id={id}
          placeholder="Search customers by name or @handle…"
          value={query}
          onChange={(event) => setTypedQuery(event.target.value)}
          onBlur={() => setTypedQuery(null)}
          className="pr-8"
        />
        {value && (
          <button
            type="button"
            onClick={clearCustomer}
            aria-label="Clear selected customer"
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

          {!isLoading && customers.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No customers found for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {customers.map((customer) => (
            <AutocompleteItem
              key={customer.userId}
              value={customer.userId}
              onSelect={() => selectCustomer(customer.userId)}
            >
              <span className="truncate text-[13px] text-foreground">{customer.name}</span>
              <span className="ml-1.5 shrink-0 text-[12px] text-muted-foreground">
                @{customer.handle}
              </span>
            </AutocompleteItem>
          ))}
        </AutocompleteContent>
      )}
    </Autocomplete>
  );
};
