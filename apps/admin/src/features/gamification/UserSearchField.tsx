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

import { gamificationApi } from "./api";
import type { UserSearchResult } from "./schemas";

const USER_SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export type SelectedUser = Pick<UserSearchResult, "id" | "name" | "handle">;

type UserSearchFieldProps = {
  id: string;
  label: string;
  value: SelectedUser | null;
  onChange: (user: SelectedUser | null) => void;
};

const describeUser = (user: SelectedUser) => `${user.name} (@${user.handle})`;

export const UserSearchField = ({ id, label, value, onChange }: UserSearchFieldProps) => {
  const [query, setQuery] = useState(value ? describeUser(value) : "");

  const [syncedValueId, setSyncedValueId] = useState(value?.id ?? null);
  if ((value?.id ?? null) !== syncedValueId) {
    setSyncedValueId(value?.id ?? null);
    setQuery(value ? describeUser(value) : "");
  }

  const debouncedQuery = useDebouncedValue(query, USER_SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const { data: results, isLoading } = useQuery({
    queryKey: ["admin-user-search", debouncedQuery],
    queryFn: () => gamificationApi.searchUsers(debouncedQuery.trim()),
    enabled: isSearching,
  });
  const users = results ?? [];

  const selectUser = (userId: string) => {
    const user = users.find((candidate) => candidate.id === userId);
    if (!user) return;
    setQuery(describeUser(user));
    onChange({ id: user.id, name: user.name, handle: user.handle });
  };

  const clearUser = () => {
    setQuery("");
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        {label}
      </label>
      <Autocomplete>
        <div className="relative">
          <AutocompleteInput
            id={id}
            placeholder="Search by name or @handle…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => setQuery(value ? describeUser(value) : "")}
            className="pr-8"
          />
          {value && (
            <button
              type="button"
              onClick={clearUser}
              aria-label="Clear selected user"
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

            {!isLoading && users.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No users found for &ldquo;{debouncedQuery}&rdquo;
              </p>
            )}

            {users.map((user) => (
              <AutocompleteItem key={user.id} value={user.id} onSelect={() => selectUser(user.id)}>
                <span className="truncate text-[13px] text-foreground">{user.name}</span>
                <span className="ml-1.5 shrink-0 text-[12px] text-muted-foreground">
                  @{user.handle}
                </span>
              </AutocompleteItem>
            ))}
          </AutocompleteContent>
        )}
      </Autocomplete>
    </div>
  );
};
