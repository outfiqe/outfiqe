"use client";

import {
  type EventSocket,
  toEventSocket,
  useConversationRoomSubscription,
  useConversationSocket,
  usePresenceSocket,
  useStartConversation,
} from "@outfiqe/hooks";
import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useAuth } from "@/features/auth";
import { conversationsApi } from "@/shared/lib/conversationsApi";
import {
  acquireSocketConnection,
  getSocket,
  releaseSocketConnection,
} from "@/shared/lib/socketClient";

type ChatPanelView = { kind: "list" } | { kind: "thread"; conversationId: string };

type ChatPanelContextValue = {
  isOpen: boolean;
  view: ChatPanelView;
  isStartingConversation: boolean;
  socket: EventSocket | null;
  openConversationWith: (userId: string) => void;
  openConversation: (conversationId: string) => void;
  openList: () => void;
  close: () => void;
};

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

const getSocketSnapshot = (): EventSocket => toEventSocket(getSocket());
const getServerSocketSnapshot = (): null => null;

export const ChatPanelProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, state } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ChatPanelView>({ kind: "list" });

  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    setIsOpen(false);
  }, [pathname]);

  const subscribeToSocket = useCallback(
    (_onStoreChange: () => void): (() => void) => {
      if (!isAuthenticated) return () => {};
      acquireSocketConnection();
      return () => releaseSocketConnection();
    },
    [isAuthenticated],
  );
  const rawSocket = useSyncExternalStore(
    subscribeToSocket,
    getSocketSnapshot,
    getServerSocketSnapshot,
  );
  const socket = isAuthenticated ? rawSocket : null;
  const activeConversationId = view.kind === "thread" ? view.conversationId : null;

  useConversationSocket(socket, state.user?.id);
  usePresenceSocket(socket, activeConversationId);
  useConversationRoomSubscription(socket, activeConversationId);

  const startConversation = useStartConversation(conversationsApi);

  const openConversationWith = useCallback(
    (userId: string) => {
      setIsOpen(true);
      setView({ kind: "list" });
      startConversation.mutate(userId, {
        onSuccess: (conversation) => setView({ kind: "thread", conversationId: conversation.id }),
      });
    },
    [startConversation],
  );

  const openConversation = useCallback((conversationId: string) => {
    setIsOpen(true);
    setView({ kind: "thread", conversationId });
  }, []);

  const openList = useCallback(() => {
    setIsOpen(true);
    setView({ kind: "list" });
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<ChatPanelContextValue>(
    () => ({
      isOpen,
      view,
      isStartingConversation: startConversation.isPending,
      socket,
      openConversationWith,
      openConversation,
      openList,
      close,
    }),
    [
      isOpen,
      view,
      startConversation.isPending,
      socket,
      openConversationWith,
      openConversation,
      openList,
      close,
    ],
  );

  return <ChatPanelContext.Provider value={value}>{children}</ChatPanelContext.Provider>;
};

export const useChatPanel = (): ChatPanelContextValue => {
  const context = useContext(ChatPanelContext);
  if (!context) throw new Error("useChatPanel must be used within a ChatPanelProvider");
  return context;
};
