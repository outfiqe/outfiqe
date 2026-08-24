"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/shared/lib/cn";

import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";

type MessagesPageLayoutProps = {
  conversationId?: string;
};

export const MessagesPageLayout = ({ conversationId }: MessagesPageLayoutProps) => {
  const router = useRouter();

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-5xl overflow-hidden border-border sm:my-6 sm:h-[calc(100vh-10rem)] sm:rounded-2xl sm:border">
      <div
        className={cn(
          "w-full shrink-0 border-r border-border sm:w-80",
          conversationId && "hidden sm:block",
        )}
      >
        <ConversationList
          onSelect={(id) => router.push(`/messages/${id}`)}
          activeConversationId={conversationId}
        />
      </div>
      <div className={cn("flex-1", !conversationId && "hidden sm:flex")}>
        {conversationId ? (
          <MessageThread conversationId={conversationId} onBack={() => router.push("/messages")} />
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
