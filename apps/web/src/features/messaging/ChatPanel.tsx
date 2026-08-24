"use client";

import { Drawer } from "@outfiqe/design-system";
import { Maximize2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useChatPanel } from "./ChatPanelContext";
import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";

export const ChatPanel = () => {
  const router = useRouter();
  const { isOpen, view, openList, close } = useChatPanel();

  if (!isOpen) return null;

  const handleExpand = (): void => {
    router.push(view.kind === "thread" ? `/messages/${view.conversationId}` : "/messages");
    close();
  };

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title="Messages"
      ariaLabel="Chat"
      actions={
        <button
          type="button"
          onClick={handleExpand}
          aria-label="Open in full page"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <Maximize2 className="size-4" />
        </button>
      }
    >
      {view.kind === "thread" ? (
        <MessageThread conversationId={view.conversationId} onBack={openList} />
      ) : (
        <ConversationList />
      )}
    </Drawer>
  );
};
