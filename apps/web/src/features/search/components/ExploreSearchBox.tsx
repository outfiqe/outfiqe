"use client";

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteGroup,
  AutocompleteInput,
  AutocompleteItem,
  Skeleton,
} from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";
import { EXPLORE_SEARCH_PATH } from "@/shared/lib/exploreMode";

import { useExploreAutocomplete } from "../hooks/useExploreAutocomplete";
import { AUTOCOMPLETE_DEBOUNCE_MS, MIN_QUERY_LENGTH } from "../search.constants";

type ExploreSearchBoxProps = {
  placeholder: string;
  formClassName: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
};

const creatorSuggestionValue = (userId: string) => `creator:${userId}`;
const postSuggestionValue = (id: string) => `post:${id}`;

export const ExploreSearchBox = ({
  placeholder,
  formClassName,
  inputClassName,
  autoFocus,
  onNavigate,
}: ExploreSearchBoxProps) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), AUTOCOMPLETE_DEBOUNCE_MS);
  const hasQuery = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const {
    creators: creatorSuggestions,
    posts: postSuggestions,
    isLoading,
  } = useExploreAutocomplete(debouncedQuery, hasQuery);

  const goToResults = (value: string) => {
    setQuery("");
    onNavigate?.();
    router.push(`${EXPLORE_SEARCH_PATH}?q=${encodeURIComponent(value)}`);
  };

  const goToCreatorProfile = (handle: string) => {
    setQuery("");
    onNavigate?.();
    router.push(`/creator/${handle}`);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) goToResults(trimmed);
  };

  const hasSuggestions =
    (creatorSuggestions?.length ?? 0) > 0 || (postSuggestions?.length ?? 0) > 0;

  return (
    <Autocomplete autoHighlightFirst={false}>
      <form onSubmit={submitSearch} className={formClassName}>
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <AutocompleteInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            "h-auto border-0 bg-transparent p-0 text-sm text-foreground shadow-none outline-none focus-visible:border-0",
            inputClassName,
          )}
        />
      </form>

      {hasQuery && (
        <AutocompleteContent className="mt-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2.5 px-1.5 py-1.5">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-2/3 rounded" />
                  <Skeleton className="h-2.5 w-1/3 rounded" />
                </div>
              </div>
            ))}

          {!isLoading && !hasSuggestions && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No creators or posts found for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {!isLoading && creatorSuggestions && creatorSuggestions.length > 0 && (
            <AutocompleteGroup label="Creators">
              {creatorSuggestions.map(({ userId, name, handle, avatarUrl }) => (
                <AutocompleteItem
                  key={userId}
                  value={creatorSuggestionValue(userId)}
                  onSelect={() => goToCreatorProfile(handle)}
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cover bg-center"
                    style={
                      avatarUrl
                        ? { backgroundImage: `url(${avatarUrl})` }
                        : { backgroundColor: getAvatarColor(userId) }
                    }
                  >
                    {!avatarUrl && (
                      <span aria-hidden className="text-xs font-bold text-white">
                        {initialsFor(name)}
                      </span>
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-foreground">{name}</span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">
                      @{handle}
                    </span>
                  </span>
                </AutocompleteItem>
              ))}
            </AutocompleteGroup>
          )}

          {!isLoading && postSuggestions && postSuggestions.length > 0 && (
            <AutocompleteGroup label="Posts">
              {postSuggestions.map((post) => (
                <AutocompleteItem
                  key={post.id}
                  value={postSuggestionValue(post.id)}
                  onSelect={() => goToCreatorProfile(post.creator.handle)}
                >
                  <div
                    className="size-9 shrink-0 rounded-md bg-muted bg-cover bg-center"
                    style={{ backgroundImage: `url(${post.imageUrl})` }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-foreground">
                      {post.caption ?? `@${post.creator.handle}`}
                    </span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">
                      by @{post.creator.handle}
                    </span>
                  </span>
                </AutocompleteItem>
              ))}
            </AutocompleteGroup>
          )}
        </AutocompleteContent>
      )}
    </Autocomplete>
  );
};
