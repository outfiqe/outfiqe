"use client";

import { Button, Input, Modal, Skeleton } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import Link from "next/link";
import { useState } from "react";

import { useFollowingList } from "@/shared/hooks/useFollowingList";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import type { FollowingItem } from "@/shared/lib/followApi";

const SEARCH_DEBOUNCE_MS = 300;

const resolveFollowingItemHref = (item: FollowingItem): string | null => {
  if (item.kind === "brand") return `/brand/${item.id}`;
  if (item.isCreator) return `/creator/${item.handle}`;
  return null;
};

const FollowingRow = ({ item }: { item: FollowingItem }) => {
  const identity = (
    <>
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: getAvatarColor(item.id) }}
      >
        {initialsFor(item.name)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[13.5px] font-semibold text-foreground">
          {item.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {item.kind === "user" ? `@${item.handle}` : "Brand"}
        </span>
      </span>
    </>
  );

  const href = resolveFollowingItemHref(item);

  return (
    <div className="flex items-center gap-3 py-2">
      {href ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
          {identity}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{identity}</span>
      )}
    </div>
  );
};

type FollowingModalProps = {
  userId: string;
  onClose: () => void;
};

export const FollowingModal = ({ userId, onClose }: FollowingModalProps) => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useFollowingList(
    userId,
    debouncedQuery,
    true,
  );
  const following = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Modal open onClose={onClose} title="Following" className="sm:max-w-sm">
      <Input
        placeholder="Search following"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mb-3"
      />

      <div className="max-h-[60vh] space-y-1 overflow-y-auto">
        {isLoading &&
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 py-2">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/3 rounded" />
                <Skeleton className="h-2.5 w-1/3 rounded" />
              </div>
            </div>
          ))}

        {!isLoading && following.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {debouncedQuery ? `No results for "${debouncedQuery}".` : "Not following anyone yet."}
          </p>
        )}

        {following.map((item) => (
          <FollowingRow key={`${item.kind}-${item.id}`} item={item} />
        ))}

        {hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
