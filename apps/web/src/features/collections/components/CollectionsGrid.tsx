"use client";

import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

import { useInfiniteCollections } from "../hooks/useInfiniteCollections";
import { CollectionCard } from "./CollectionCard";
import { CollectionGridSkeleton } from "./CollectionGridSkeleton";

export const CollectionsGrid = () => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteCollections();

  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  const collections = data?.pages.flatMap((page) => page.collections) ?? [];

  if (isLoading) return <CollectionGridSkeleton />;

  if (isError) {
    return <p className="py-12 text-sm text-muted-foreground">Couldn&apos;t load collections.</p>;
  }

  if (collections.length === 0) {
    return <p className="py-12 text-sm text-muted-foreground">No collections yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>

      {hasNextPage && (
        <div ref={sentinelRef} className="mt-10 flex justify-center">
          <span className="text-xs text-muted-foreground">
            {isFetchingNextPage ? "Loading more…" : ""}
          </span>
        </div>
      )}
    </>
  );
};
