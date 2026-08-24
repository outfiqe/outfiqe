export type ChatSettings = {
  isChatEnabled: boolean;
};

export type ChatContact = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
};

export type BlockedChatContact = ChatContact & {
  blockedAt: string;
};

export type ChatBlocksPage = {
  items: BlockedChatContact[];
  nextCursor: string | null;
};

export type ConversationType = "DIRECT" | "GROUP" | "SUPPORT";

export type ConversationParticipantView = ChatContact & {
  isOnline: boolean;
  lastSeenAt: string | null;
};

export type ConversationPreview = {
  id: string;
  type: ConversationType;
  otherParticipant: ConversationParticipantView | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  updatedAt: string;
};

export type ConversationsPage = {
  items: ConversationPreview[];
  nextCursor: string | null;
};

export type MessageAttachment = {
  id: string;
  url: string;
  mimeType: string;
  width: number | null;
  height: number | null;
};

export type NewMessageAttachmentInput = {
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  sender: ChatContact;
  body: string | null;
  attachments: MessageAttachment[];
  createdAt: string;
  isMine: boolean;
  isDeliveredToOthers: boolean;
  isReadByOthers: boolean;
};

export type MessagesPage = {
  items: Message[];
  nextCursor: string | null;
};
