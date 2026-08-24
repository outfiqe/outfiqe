"use client";

import { useConversations } from "@outfiqe/hooks";
import { MessageCircle } from "lucide-react";

import { useAuth } from "@/features/auth";
import { conversationsApi } from "@/shared/lib/conversationsApi";

import { useChatPanel } from "./ChatPanelContext";

const MAX_DISPLAYED_UNREAD_COUNT = 99;

const formatBadgeCount = (count: number): string =>
  count > MAX_DISPLAYED_UNREAD_COUNT ? `${MAX_DISPLAYED_UNREAD_COUNT}+` : `${count}`;

export const FloatingChatLauncher = () => {
  const { isAuthenticated } = useAuth();
  const { isOpen, openList } = useChatPanel();
  const conversationsQuery = useConversations(conversationsApi, isAuthenticated);

  if (!isAuthenticated || isOpen) return null;

  const totalUnread = (conversationsQuery.data?.pages ?? [])
    .flatMap((page) => page.items)
    .reduce((sum, item) => sum + item.unreadCount, 0);

  return (
    <button
      type="button"
      onClick={openList}
      aria-label={totalUnread > 0 ? `Open chat, ${totalUnread} unread` : "Open chat"}
      className="fixed bottom-6 right-6 z-30 flex size-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle className="size-6" />
      {totalUnread > 0 && (
        <span
          aria-hidden
          className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
        >
          {formatBadgeCount(totalUnread)}
        </span>
      )}
    </button>
  );
};
