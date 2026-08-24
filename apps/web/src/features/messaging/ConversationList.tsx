"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { useConversations } from "@outfiqe/hooks";

import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";
import { conversationsApi } from "@/shared/lib/conversationsApi";
import { formatRelativeTime } from "@/shared/lib/formatRelativeTime";

const SKELETON_ROW_COUNT = 4;
const MAX_DISPLAYED_ROW_UNREAD_COUNT = 9;

const ConversationRowSkeleton = () => (
  <li className="flex items-center gap-3 px-4 py-3">
    <Skeleton className="size-11 shrink-0 rounded-full" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-3 w-2/3 rounded" />
      <Skeleton className="h-2.5 w-1/2 rounded" />
    </div>
  </li>
);

type ConversationListProps = {
  onSelect: (conversationId: string) => void;
  activeConversationId?: string;
};

export const ConversationList = ({ onSelect, activeConversationId }: ConversationListProps) => {
  const conversationsQuery = useConversations(conversationsApi);
  const conversations = conversationsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  if (conversationsQuery.isLoading) {
    return (
      <ul
        className="h-full divide-y divide-border overflow-y-auto"
        role="status"
        aria-label="Loading conversations"
      >
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <ConversationRowSkeleton key={index} />
        ))}
      </ul>
    );
  }

  if (conversationsQuery.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load your messages.</p>
        <Button variant="outline" size="sm" onClick={() => void conversationsQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
        <p className="text-sm font-medium text-foreground">No messages yet</p>
        <p className="text-xs text-muted-foreground">
          Start a conversation from someone&apos;s profile.
        </p>
      </div>
    );
  }

  return (
    <ul className="h-full divide-y divide-border overflow-y-auto">
      {conversations.map((conversation) => {
        const participant = conversation.otherParticipant;
        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted",
                activeConversationId === conversation.id && "bg-muted",
              )}
            >
              <span className="relative shrink-0">
                <span
                  aria-hidden
                  className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-cover bg-center text-sm font-bold text-white"
                  style={
                    participant?.avatarUrl
                      ? { backgroundImage: `url(${participant.avatarUrl})` }
                      : { backgroundColor: getAvatarColor(participant?.id ?? conversation.id) }
                  }
                >
                  {!participant?.avatarUrl && initialsFor(participant?.name ?? "?")}
                </span>
                {participant?.isOnline && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-emerald-500"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13.5px] font-semibold text-foreground">
                    {participant?.name ?? "Unknown"}
                  </span>
                  {conversation.lastMessageAt && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatRelativeTime(conversation.lastMessageAt)}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span
                    className={
                      conversation.unreadCount > 0
                        ? "truncate text-xs font-semibold text-foreground"
                        : "truncate text-xs text-muted-foreground"
                    }
                  >
                    {conversation.lastMessagePreview}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span
                      aria-hidden
                      className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
                    >
                      {conversation.unreadCount > MAX_DISPLAYED_ROW_UNREAD_COUNT
                        ? `${MAX_DISPLAYED_ROW_UNREAD_COUNT}+`
                        : conversation.unreadCount}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}

      {conversationsQuery.hasNextPage && (
        <li className="flex justify-center py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void conversationsQuery.fetchNextPage()}
            disabled={conversationsQuery.isFetchingNextPage}
          >
            {conversationsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </li>
      )}
    </ul>
  );
};
