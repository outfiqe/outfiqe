"use client";

import { Button, Input, Modal, Skeleton } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useFollowersList } from "@/shared/hooks/useFollowersList";
import { useToggleFollow } from "@/shared/hooks/useToggleFollow";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";
import type { Follower, FollowTargetType } from "@/shared/lib/followApi";

const SEARCH_DEBOUNCE_MS = 300;

type FollowerRowProps = {
  follower: Follower;
  viewerId?: string;
};

const FollowerRow = ({ follower, viewerId }: FollowerRowProps) => {
  const followMutation = useToggleFollow("user");
  const [isFollowing, setIsFollowing] = useState(follower.isFollowedByViewer);
  const isSelf = follower.id === viewerId;

  const toggleFollow = () => {
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    followMutation.mutate(
      { targetId: follower.id, following: wasFollowing },
      { onError: () => setIsFollowing(wasFollowing) },
    );
  };

  const identity = (
    <>
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: getAvatarColor(follower.id) }}
      >
        {initialsFor(follower.name)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[13.5px] font-semibold text-foreground">
          {follower.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">@{follower.handle}</span>
      </span>
    </>
  );

  return (
    <div className="flex items-center gap-3 py-2">
      {follower.isCreator ? (
        <Link
          href={`/creator/${follower.handle}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {identity}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{identity}</span>
      )}

      {!isSelf && (
        <button
          type="button"
          onClick={toggleFollow}
          aria-pressed={isFollowing}
          className={cn(
            "shrink-0 cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            isFollowing
              ? "border-foreground bg-foreground text-background"
              : "border-foreground text-foreground hover:bg-foreground hover:text-background",
          )}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
};

type FollowersModalProps = {
  targetType: FollowTargetType;
  targetId: string;
  onClose: () => void;
};

export const FollowersModal = ({ targetType, targetId, onClose }: FollowersModalProps) => {
  const { state } = useAuth();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useFollowersList(
    targetType,
    targetId,
    debouncedQuery,
    true,
  );
  const followers = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Modal open onClose={onClose} title="Followers" className="sm:max-w-sm">
      <Input
        placeholder="Search followers"
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

        {!isLoading && followers.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {debouncedQuery ? `No followers found for "${debouncedQuery}".` : "No followers yet."}
          </p>
        )}

        {followers.map((follower) => (
          <FollowerRow key={follower.id} follower={follower} viewerId={state.user?.id} />
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
