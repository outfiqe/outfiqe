import type { SidebarNavSection } from "@outfiqe/components";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  flattenSidebarSections,
  MODULE_SEARCH_MIN_QUERY_LENGTH,
  searchAdminModules,
} from "./AdminModuleSearch.utils";

const MODULE_SEARCH_DEBOUNCE_MS = 150;

export const AdminModuleSearch = ({ sections }: { sections: readonly SidebarNavSection[] }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, MODULE_SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const isSearching = trimmedQuery.length >= MODULE_SEARCH_MIN_QUERY_LENGTH;

  const searchableModules = useMemo(() => flattenSidebarSections(sections), [sections]);
  const results = useMemo(
    () => searchAdminModules(searchableModules, trimmedQuery),
    [searchableModules, trimmedQuery],
  );

  const selectResult = (resultId: string) => {
    const result = results.find((candidate) => candidate.id === resultId);
    if (!result) return;
    setQuery("");
    navigate({ href: result.href });
  };

  return (
    <Autocomplete>
      <AutocompleteInput
        aria-label="Search admin modules"
        placeholder="Search modules…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full"
      />

      {isSearching && (
        <AutocompleteContent>
          {results.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No modules match &ldquo;{trimmedQuery}&rdquo;
            </p>
          )}

          {results.map((result) => {
            const Icon = result.icon;
            return (
              <AutocompleteItem
                key={result.id}
                value={result.id}
                onSelect={() => selectResult(result.id)}
              >
                {Icon && <Icon className="mr-2 size-3.5 shrink-0 text-muted-foreground" />}
                <span className="truncate text-[13px] text-foreground">{result.label}</span>
                <span className="ml-auto shrink-0 pl-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {result.sectionLabel}
                </span>
              </AutocompleteItem>
            );
          })}
        </AutocompleteContent>
      )}
    </Autocomplete>
  );
};
