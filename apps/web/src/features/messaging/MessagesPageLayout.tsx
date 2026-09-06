"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/cn";

import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";

const MESSAGES_BASE_PATH = "/messages";

type MessagesPageLayoutProps = {
  conversationId?: string;
};

const conversationIdFromPathname = (pathname: string): string | undefined => {
  if (!pathname.startsWith(`${MESSAGES_BASE_PATH}/`)) return undefined;
  const [id] = pathname.slice(MESSAGES_BASE_PATH.length + 1).split("/");
  return id || undefined;
};

export const MessagesPageLayout = ({ conversationId }: MessagesPageLayoutProps) => {
  const pathname = usePathname();
  const activeConversationId = conversationIdFromPathname(pathname) ?? conversationId;

  const openConversation = (id: string) => {
    window.history.pushState(null, "", `${MESSAGES_BASE_PATH}/${id}`);
  };

  const closeConversation = () => {
    window.history.pushState(null, "", MESSAGES_BASE_PATH);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-12.5rem)] max-w-5xl overflow-hidden border-border sm:my-6 sm:h-[calc(100dvh-14.5rem)] sm:rounded-2xl sm:border lg:h-[calc(100dvh-10rem)]">
      <div
        className={cn(
          "w-full shrink-0 border-r border-border sm:w-80",
          activeConversationId && "hidden sm:block",
        )}
      >
        <ConversationList onSelect={openConversation} activeConversationId={activeConversationId} />
      </div>
      <div
        className={cn(
          "flex-1",
          !activeConversationId && "hidden sm:flex sm:items-center sm:justify-center",
        )}
      >
        {activeConversationId ? (
          <MessageThread conversationId={activeConversationId} onBack={closeConversation} />
        ) : (
          <div className="hidden h-full flex-col items-center justify-center gap-1 text-center sm:flex">
            <p className="text-sm font-medium text-foreground">Select a conversation</p>
            <p className="text-xs text-muted-foreground">
              Choose someone from the list to start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
