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

export type ConversationMemberRole = "ADMIN" | "MEMBER";

export type MessageKind = "USER" | "SYSTEM";

export type ConversationParticipantView = ChatContact & {
  isOnline: boolean;
  lastSeenAt: string | null;
};

export type ConversationGroupSummary = {
  name: string;
  memberCount: number;
  members: ChatContact[];
  myRole: ConversationMemberRole;
};

export type ConversationPreview = {
  id: string;
  type: ConversationType;
  otherParticipant: ConversationParticipantView | null;
  group: ConversationGroupSummary | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  updatedAt: string;
};

export type ConversationMember = ChatContact & {
  role: ConversationMemberRole;
  joinedAt: string;
};

export type GroupMembers = { members: ConversationMember[] };

export type CreateGroupInput = { name: string; memberIds: string[] };

export type ChatMemberReference = { id: string; name: string };

export type ChatSystemEvent =
  | { type: "GROUP_CREATED"; groupName: string }
  | { type: "GROUP_RENAMED"; groupName: string }
  | { type: "MEMBERS_ADDED"; members: ChatMemberReference[] }
  | { type: "MEMBER_REMOVED"; member: ChatMemberReference }
  | { type: "MEMBER_LEFT" }
  | { type: "ADMIN_ASSIGNED"; member: ChatMemberReference }
  | { type: "ADMIN_REMOVED"; member: ChatMemberReference };

export type ChatSystemEventType = ChatSystemEvent["type"];

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
  kind: MessageKind;
  systemEvent: ChatSystemEvent | null;
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
