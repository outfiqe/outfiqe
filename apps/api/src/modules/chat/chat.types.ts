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

export enum ChatUnavailableReason {
  YOU_TURNED_OFF_THIS_PERSON = "YOU_TURNED_OFF_THIS_PERSON",
  YOUR_CHAT_DISABLED = "YOUR_CHAT_DISABLED",
  RECIPIENT_UNREACHABLE = "RECIPIENT_UNREACHABLE",
}

export type ChatAvailability =
  { isAvailable: true } | { isAvailable: false; reason: ChatUnavailableReason };
