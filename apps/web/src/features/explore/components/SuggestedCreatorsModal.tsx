"use client";

import { Modal } from "@outfiqe/design-system";

import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

import { useFollowCreator } from "../hooks/useFollowCreator";
import { useInfiniteSuggestedCreators } from "../hooks/useInfiniteSuggestedCreators";
import { SuggestedCreatorRow, SuggestedCreatorRowSkeleton } from "./SuggestedCreatorRow";

type SuggestedCreatorsModalProps = {
  onClose: () => void;
};

export const SuggestedCreatorsModal = ({ onClose }: SuggestedCreatorsModalProps) => {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteSuggestedCreators(true);
  const followMutation = useFollowCreator();

  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  const creators = data?.pages.flatMap((page) => page.creators) ?? [];

  return (
    <Modal
      open
      onClose={onClose}
      title="Creators to follow"
      description="Find more creators similar to who you already follow and engage with."
      className="max-h-[60vh] sm:max-w-2xl"
    >
      <div className="flex flex-col">
        {isLoading &&
          Array.from({ length: 6 }).map((_, index) => <SuggestedCreatorRowSkeleton key={index} />)}

        {!isLoading && creators.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No suggestions right now.
          </p>
        )}

        {creators.map((creator) => (
          <SuggestedCreatorRow
            key={creator.id}
            creator={creator}
            onFollow={(creatorId) => followMutation.mutate({ creatorId, following: false })}
          />
        ))}

        {hasNextPage && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {isFetchingNextPage && (
              <span className="text-xs text-muted-foreground">Loading more…</span>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
