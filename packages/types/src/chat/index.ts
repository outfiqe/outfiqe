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
