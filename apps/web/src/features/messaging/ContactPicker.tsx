"use client";

import { Checkbox, Input, Skeleton } from "@outfiqe/design-system";
import { useChatContactSearch, useDebouncedValue } from "@outfiqe/hooks";
import type { ChatContact } from "@outfiqe/types";
import { Search, X } from "lucide-react";
import { useId, useState } from "react";

import { chatApi } from "@/shared/lib/chatApi";

const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_ROW_COUNT = 3;

type ContactPickerProps = {
  selectedContacts: ChatContact[];
  onChange: (contacts: ChatContact[]) => void;
  excludedUserIds?: string[];
  maxSelectable: number;
};

export const ContactPicker = ({
  selectedContacts,
  onChange,
  excludedUserIds = [],
  maxSelectable,
}: ContactPickerProps) => {
  const searchInputId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const contactSearch = useChatContactSearch(chatApi, debouncedSearchQuery);

  const selectedIds = new Set(selectedContacts.map(({ id }) => id));
  const matchingContacts = (contactSearch.data ?? []).filter(
    ({ id }) => !excludedUserIds.includes(id),
  );
  const isAtLimit = selectedContacts.length >= maxSelectable;
  const hasSearched = debouncedSearchQuery.trim().length > 0;

  const toggleContact = (contact: ChatContact): void => {
    onChange(
      selectedIds.has(contact.id)
        ? selectedContacts.filter(({ id }) => id !== contact.id)
        : [...selectedContacts, contact],
    );
  };

  return (
    <div className="space-y-3">
      {selectedContacts.length > 0 && (
        <ul aria-label="Selected people" className="flex flex-wrap gap-1.5">
          {selectedContacts.map((contact) => (
            <li key={contact.id}>
              <button
                type="button"
                onClick={() => toggleContact(contact)}
                aria-label={`Remove ${contact.name}`}
                className="flex cursor-pointer items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
              >
                {contact.name}
                <X aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <label htmlFor={searchInputId} className="sr-only">
          Search people
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={searchInputId}
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search people by name"
          className="pl-9"
        />
      </div>

      {isAtLimit && (
        <p className="text-xs text-muted-foreground">
          You&apos;ve reached the most people you can add at once.
        </p>
      )}

      {contactSearch.isFetching && (
        <div role="status" aria-label="Searching people" className="space-y-2">
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      )}

      {contactSearch.isError && (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t search people right now.
        </p>
      )}

      {hasSearched && !contactSearch.isFetching && matchingContacts.length === 0 && (
        <p className="text-sm text-muted-foreground">Nobody matches that name.</p>
      )}

      {!contactSearch.isFetching && matchingContacts.length > 0 && (
        <ul aria-label="Search results" className="max-h-60 space-y-1 overflow-y-auto">
          {matchingContacts.map((contact) => {
            const isSelected = selectedIds.has(contact.id);
            const checkboxId = `${searchInputId}-${contact.id}`;
            return (
              <li key={contact.id}>
                <label
                  htmlFor={checkboxId}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={isSelected}
                    disabled={!isSelected && isAtLimit}
                    onChange={() => toggleContact(contact)}
                  />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {contact.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{contact.handle}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
