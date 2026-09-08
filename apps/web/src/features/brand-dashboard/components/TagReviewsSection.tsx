"use client";

import { Button, Skeleton, Tabs, TabsList, TabsTrigger, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { RejectTagInput, TagReviewQueueItem } from "../api/tagReviewSchemas";
import { useReviewTagActions } from "../hooks/useReviewTagActions";
import { useTagReviewPendingCount } from "../hooks/useTagReviewPendingCount";
import { useTagReviewQueue } from "../hooks/useTagReviewQueue";
import { TAG_REVIEW_QUEUE_TABS } from "../tagReview.constants";
import { RejectTagModal } from "./RejectTagModal";
import { TagReviewCard } from "./TagReviewCard";

const EMPTY_COPY: Record<string, string> = {
  PENDING: "No tags waiting for review. New creator tags on your products will show up here.",
  APPROVED: "No approved creator tags yet.",
  REJECTED: "You haven't declined any creator tags.",
};

export const TagReviewsSection = () => {
  const [tab, setTab] = useState(TAG_REVIEW_QUEUE_TABS[0]!.status);
  const [rejectingItem, setRejectingItem] = useState<TagReviewQueueItem | null>(null);

  const pendingCount = useTagReviewPendingCount();
  const queue = useTagReviewQueue(tab);
  const { approve, reject } = useReviewTagActions();

  const items = queue.data?.pages.flatMap((page) => page.items) ?? [];
  const busyTagId = approve.isPending
    ? approve.variables?.tagId
    : reject.isPending
      ? reject.variables?.tagId
      : undefined;

  const approveTag = (item: TagReviewQueueItem, trustCreator: boolean) => {
    approve.mutate(
      { tagId: item.id, trustCreator },
      {
        onSuccess: () =>
          toast.success(
            trustCreator ? `Approved — ${item.creator.name} is now trusted` : "Tag approved",
          ),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const rejectTag = (input: RejectTagInput) => {
    if (!rejectingItem) return;
    const wasLive = rejectingItem.reviewStatus === "APPROVED";
    reject.mutate(
      { tagId: rejectingItem.id, input },
      {
        onSuccess: () => {
          toast.success(wasLive ? "Tag removed" : "Tag declined");
          setRejectingItem(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Tag reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Creators can tag your products in their looks. A tag only goes live once you approve it —
          {pendingCount.data ? ` ${pendingCount.data} waiting now.` : " nothing waiting right now."}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="mt-5">
        <TabsList>
          {TAG_REVIEW_QUEUE_TABS.map(({ status, label }) => (
            <TabsTrigger key={status} value={status}>
              {label}
              {status === "PENDING" && pendingCount.data ? ` (${pendingCount.data})` : ""}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {queue.isPending && (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {queue.isError && (
        <div className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load the review queue. {getErrorMessage(queue.error)}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void queue.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!queue.isPending && !queue.isError && items.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">{EMPTY_COPY[tab]}</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <TagReviewCard
              key={item.id}
              item={item}
              isBusy={busyTagId === item.id}
              onApprove={(trustCreator) => approveTag(item, trustCreator)}
              onReject={() => setRejectingItem(item)}
            />
          ))}
        </div>
      )}

      {queue.hasNextPage && (
        <div className="mt-5 flex justify-center">
          <Button
            variant="outline"
            onClick={() => void queue.fetchNextPage()}
            disabled={queue.isFetchingNextPage}
          >
            {queue.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      {rejectingItem && (
        <RejectTagModal
          item={rejectingItem}
          isSubmitting={reject.isPending}
          submitError={reject.isError ? reject.error : null}
          onClose={() => setRejectingItem(null)}
          onSubmit={rejectTag}
        />
      )}
    </div>
  );
};
