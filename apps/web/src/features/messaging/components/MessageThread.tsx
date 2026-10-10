"use client";

import { Skeleton } from "@outfiqe/design-system";
import { useConversation, useConversationThread, useMarkConversationRead } from "@outfiqe/hooks";
import type { Message } from "@outfiqe/types";
import { ArrowLeft, Check, CheckCheck, Info } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { BuildCardMessage } from "@/features/outfit-build/components/BuildCardMessage";
import { AppImage } from "@/shared/components/AppImage";
import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";
import { conversationsApi } from "@/shared/lib/conversationsApi";

import {
  formatLastSeen,
  formatMessageClock,
  formatMessageDateSeparator,
} from "../utils/messagingTime";
import { GroupAvatar } from "./GroupAvatar";
import { GroupInfoPanel } from "./GroupInfoPanel";
import { MessageComposer } from "./MessageComposer";
import { SystemMessageLine } from "./SystemMessageLine";

const SCROLL_TO_BOTTOM_THRESHOLD_PX = 150;
const SKELETON_ROW_COUNT = 3;

type MessageThreadProps = {
  conversationId: string;
  onBack: () => void;
};

const USER_MESSAGE_KIND = "USER";
const OUTFIT_CARD_MESSAGE_KIND = "OUTFIT_CARD";

const ThreadMessage = ({ message, senderLabel }: { message: Message; senderLabel?: string }) => {
  if (message.kind === USER_MESSAGE_KIND) {
    return <MessageBubble message={message} senderLabel={senderLabel} />;
  }
  if (message.kind === OUTFIT_CARD_MESSAGE_KIND) return <BuildCardMessage message={message} />;
  return <SystemMessageLine message={message} />;
};

const MessageBubble = ({ message, senderLabel }: { message: Message; senderLabel?: string }) => (
  <div className={cn("flex flex-col", message.isMine ? "items-end" : "items-start")}>
    {senderLabel && (
      <span className="mb-0.5 px-1 text-[11px] font-semibold text-muted-foreground">
        {senderLabel}
      </span>
    )}
    {message.attachments.length > 0 && (
      <div className="mb-1 flex flex-wrap gap-1.5">
        {message.attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="relative h-52 w-[200px] overflow-hidden rounded-2xl bg-muted"
          >
            <AppImage src={attachment.url} alt="" fill sizes="200px" className="object-cover" />
          </div>
        ))}
      </div>
    )}
    {message.body && (
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
          message.isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {message.body}
      </div>
    )}
    <div className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
      <span>{formatMessageClock(message.createdAt)}</span>
      {message.isMine &&
        (message.isReadByOthers ? (
          <CheckCheck className="size-3 text-primary-strong" />
        ) : message.isDeliveredToOthers ? (
          <CheckCheck className="size-3" />
        ) : (
          <Check className="size-3" />
        ))}
    </div>
  </div>
);

const DateSeparator = ({ isoDate }: { isoDate: string }) => (
  <div className="flex items-center justify-center py-1">
    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
      {formatMessageDateSeparator(isoDate)}
    </span>
  </div>
);

const ThreadHeaderSkeleton = () => (
  <div
    role="status"
    aria-label="Loading conversation"
    className="flex min-w-0 flex-1 items-center gap-2"
  >
    <Skeleton className="size-9 shrink-0 rounded-full" />
    <span className="min-w-0 flex-1 space-y-1.5">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-2.5 w-16" />
    </span>
  </div>
);

export const MessageThread = ({ conversationId, onBack }: MessageThreadProps) => {
  const conversationQuery = useConversation(conversationsApi, conversationId);
  const threadQuery = useConversationThread(conversationsApi, conversationId);
  const markRead = useMarkConversationRead(conversationsApi, conversationId);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number | null>(null);
  const hasScrolledToBottomRef = useRef(false);

  const pages = threadQuery.data?.pages ?? [];
  const messages = [...pages.flatMap((page) => page.items)].reverse();
  const newestMessageId = messages.at(-1)?.id;

  const loadMoreSentinelRef = useLoadMoreOnVisible(() => {
    if (threadQuery.hasNextPage && !threadQuery.isFetchingNextPage) {
      prevScrollHeightRef.current = scrollRef.current?.scrollHeight ?? null;
      void threadQuery.fetchNextPage();
    }
  }, threadQuery.hasNextPage ?? false);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (prevScrollHeightRef.current !== null) {
      container.scrollTop += container.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = null;
      return;
    }

    if (!hasScrolledToBottomRef.current && messages.length > 0) {
      container.scrollTop = container.scrollHeight;
      hasScrolledToBottomRef.current = true;
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < SCROLL_TO_BOTTOM_THRESHOLD_PX) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    hasScrolledToBottomRef.current = false;
  }, [conversationId]);

  const markReadRef = useRef(markRead.mutate);
  useEffect(() => {
    markReadRef.current = markRead.mutate;
  });

  useEffect(() => {
    if (newestMessageId) markReadRef.current();
  }, [newestMessageId]);

  const participant = conversationQuery.data?.otherParticipant;
  const group = conversationQuery.data?.group ?? null;
  const isParticipantLoading = conversationQuery.isPending;
  const isUnavailable = conversationQuery.isError;

  if (isUnavailable) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
          </button>
        </div>
        <div
          role="status"
          className="flex flex-1 flex-col items-center justify-center gap-1 px-4 text-center"
        >
          <p className="text-sm font-medium text-foreground">
            This conversation isn&apos;t available any more
          </p>
          <p className="text-xs text-muted-foreground">
            You may have left it, or someone removed you from the group.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </button>
        {isParticipantLoading ? (
          <ThreadHeaderSkeleton />
        ) : group ? (
          <>
            <GroupAvatar
              members={group.members}
              fallbackKey={conversationId}
              sizeClassName="size-9"
            />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13.5px] font-semibold text-foreground">
                {group.name}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {group.memberCount} people
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsGroupInfoOpen(true)}
              aria-label="Group info"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
            >
              <Info className="size-4" />
            </button>
            <GroupInfoPanel
              open={isGroupInfoOpen}
              onClose={() => setIsGroupInfoOpen(false)}
              conversationId={conversationId}
              groupName={group.name}
              myRole={group.myRole}
              onLeft={() => {
                setIsGroupInfoOpen(false);
                onBack();
              }}
            />
          </>
        ) : (
          <>
            <span className="relative shrink-0">
              <span
                aria-hidden
                className="relative flex size-9 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white"
                style={
                  participant?.avatarUrl
                    ? undefined
                    : { backgroundColor: getAvatarColor(participant?.id ?? conversationId) }
                }
              >
                {participant?.avatarUrl ? (
                  <AppImage src={participant.avatarUrl} alt="" fill sizes="36px" />
                ) : (
                  initialsFor(participant?.name ?? "?")
                )}
              </span>
              {participant?.isOnline && (
                <span
                  aria-hidden
                  className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card bg-emerald-500"
                />
              )}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13.5px] font-semibold text-foreground">
                {participant?.name ?? "Conversation"}
              </span>
              {participant && (
                <span className="block truncate text-[11px] text-muted-foreground">
                  {participant.isOnline ? "Active now" : formatLastSeen(participant.lastSeenAt)}
                </span>
              )}
            </span>
          </>
        )}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3"
      >
        <div ref={loadMoreSentinelRef} />

        {threadQuery.isLoading &&
          Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <Skeleton key={index} className="ml-auto h-9 w-2/3 rounded-2xl" />
          ))}

        {!threadQuery.isLoading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Say hello</p>
            <p className="text-xs text-muted-foreground">
              {group
                ? "This is the start of the group."
                : "This is the start of your conversation."}
            </p>
          </div>
        )}

        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const showDateSeparator =
            !previous ||
            formatMessageDateSeparator(previous.createdAt) !==
              formatMessageDateSeparator(message.createdAt);
          const isNewSpeaker =
            !previous ||
            previous.senderId !== message.senderId ||
            previous.kind !== USER_MESSAGE_KIND ||
            showDateSeparator;
          const senderLabel =
            group && !message.isMine && isNewSpeaker ? message.sender.name : undefined;

          return (
            <div key={message.id}>
              {showDateSeparator && <DateSeparator isoDate={message.createdAt} />}
              <ThreadMessage message={message} senderLabel={senderLabel} />
            </div>
          );
        })}
      </div>

      <MessageComposer conversationId={conversationId} />
    </div>
  );
};
