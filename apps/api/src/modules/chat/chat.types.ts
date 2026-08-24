export type ChatContact = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
};

export type BlockedChatContact = ChatContact & {
  blockedAt: Date;
};

export type ChatBlocksPage = {
  items: BlockedChatContact[];
  nextCursor: string | null;
};

export type ChatSettingsView = {
  isChatEnabled: boolean;
};
