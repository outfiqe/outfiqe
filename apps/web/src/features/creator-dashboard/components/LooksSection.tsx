"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { Plus } from "lucide-react";
import { useState } from "react";

import { CreatorStatus } from "@/features/auth/types";

import { useMyLooks } from "../hooks/useMyLooks";
import { ApplyAsCreatorButton } from "./ApplyAsCreatorButton";
import { PostModal } from "./PostModal";

type LooksSectionProps = {
  creatorStatus: CreatorStatus;
};

export const LooksSection = ({ creatorStatus }: LooksSectionProps) => {
  const [postModalOpen, setPostModalOpen] = useState(false);
  const looks = useMyLooks();
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = looks;
  const postedLooks = data?.pages.flatMap((page) => page.looks) ?? [];

  if (creatorStatus === CreatorStatus.PENDING) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="font-display text-xl font-bold text-foreground">Application under review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;re looking at your creator application. We&apos;ll email you once it&apos;s
          reviewed.
        </p>
      </div>
    );
  }

  if (creatorStatus !== CreatorStatus.APPROVED) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="font-display text-xl font-bold text-foreground">Become a creator</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Post your fits, tag the pieces you&apos;re wearing, and get credit when someone buys
          through your post.
        </p>
        {creatorStatus === CreatorStatus.REJECTED && (
          <p className="mt-2 text-sm text-muted-foreground">
            Your last application wasn&apos;t a fit. You&apos;re welcome to apply again.
          </p>
        )}
        <div className="mt-4">
          <ApplyAsCreatorButton />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Your posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {postedLooks.length} look{postedLooks.length === 1 ? "" : "s"} posted
          </p>
        </div>
        <Button onClick={() => setPostModalOpen(true)}>
          <Plus className="size-4" />
          New post
        </Button>
      </div>

      {isLoading && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && postedLooks.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing posted yet — share your first fit.
          </p>
          <Button variant="outline" size="sm" onClick={() => setPostModalOpen(true)}>
            Post a look
          </Button>
        </div>
      )}

      {postedLooks.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {postedLooks.map(({ id, imageUrl, caption, taggedProducts }) => (
            <div
              key={id}
              className="overflow-hidden rounded-2xl border border-border transition-colors hover:border-foreground/30"
            >
              <div
                className="aspect-[4/5] w-full bg-muted bg-cover bg-center"
                style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
              />
              <div className="p-3">
                {caption && <p className="truncate text-[13px] text-foreground">{caption}</p>}
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {taggedProducts.length} tagged product
                  {taggedProducts.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      <PostModal open={postModalOpen} onClose={() => setPostModalOpen(false)} />
    </div>
  );
};
