"use client";

import { Button, Checkbox, Input, Skeleton } from "@outfiqe/design-system";
import {
  type EventSocket,
  useChatBlocks,
  useChatContactSearch,
  useChatSettings,
  useChatSettingsSocket,
  useDebouncedValue,
} from "@outfiqe/hooks";
import type { ChatContact } from "@outfiqe/types";
import { useState } from "react";

import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { chatApi } from "@/shared/lib/chatApi";

const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_ROW_COUNT = 3;

const ContactAvatar = ({
  id,
  name,
  avatarUrl,
}: {
  id: string;
  name: string;
  avatarUrl: string | null;
}) => (
  <span
    aria-hidden
    className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center text-xs font-bold text-white"
    style={
      avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : { backgroundColor: getAvatarColor(id) }
    }
  >
    {!avatarUrl && initialsFor(name)}
  </span>
);

const ContactIdentity = ({ name, handle }: { name: string; handle: string }) => (
  <span className="min-w-0 flex-1 leading-tight">
    <span className="block truncate text-[13.5px] font-semibold text-foreground">{name}</span>
    <span className="block truncate text-xs text-muted-foreground">@{handle}</span>
  </span>
);

const ContactRowSkeleton = () => (
  <li className="flex items-center gap-3 py-2">
    <Skeleton className="size-9 shrink-0 rounded-full" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-3 w-2/3 rounded" />
      <Skeleton className="h-2.5 w-1/3 rounded" />
    </div>
  </li>
);

const ChatAvailabilityToggle = () => {
  const { isChatEnabled, isLoading, isUpdating, setChatEnabled } = useChatSettings(chatApi);

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
      <div>
        <label htmlFor="chat-global-toggle" className="text-sm font-semibold text-foreground">
          Turn off chat
        </label>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          While chat is off, you won&apos;t be able to send or receive new messages from anyone.
        </p>
      </div>
      {isLoading ? (
        <Skeleton className="size-5 shrink-0 rounded" />
      ) : (
        <Checkbox
          id="chat-global-toggle"
          checked={!isChatEnabled}
          disabled={isUpdating}
          onChange={(event) => setChatEnabled(!event.target.checked)}
        />
      )}
    </div>
  );
};

const ChatBlockedContactsSection = () => {
  const { blocksQuery, unblockUser, pendingUnblockContactId } = useChatBlocks(chatApi);
  const blockedContacts = blocksQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">Turned off for these people</h2>
      <ul className="mt-2 divide-y divide-border">
        {blocksQuery.isLoading &&
          Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <ContactRowSkeleton key={index} />
          ))}

        {!blocksQuery.isLoading && blockedContacts.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            You haven&apos;t turned off chat with anyone.
          </li>
        )}

        {blockedContacts.map((contact) => (
          <li key={contact.id} className="flex items-center gap-3 py-2">
            <ContactAvatar id={contact.id} name={contact.name} avatarUrl={contact.avatarUrl} />
            <ContactIdentity name={contact.name} handle={contact.handle} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => unblockUser(contact.id)}
              disabled={pendingUnblockContactId === contact.id}
            >
              Turn chat back on
            </Button>
          </li>
        ))}
      </ul>

      {blocksQuery.hasNextPage && (
        <div className="flex justify-center pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void blocksQuery.fetchNextPage()}
            disabled={blocksQuery.isFetchingNextPage}
          >
            {blocksQuery.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
};

const ChatContactSearchSection = () => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const contactSearchQuery = useChatContactSearch(chatApi, debouncedQuery);
  const { blocksQuery, blockUser, pendingBlockContactId } = useChatBlocks(chatApi);

  const blockedIds = new Set(
    (blocksQuery.data?.pages.flatMap((page) => page.items) ?? []).map((contact) => contact.id),
  );
  const searchResults: ChatContact[] = (contactSearchQuery.data ?? []).filter(
    (contact) => !blockedIds.has(contact.id),
  );

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">
        Turn off chat with a specific person
      </h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Search for someone to stop sending and receiving messages with just them.
      </p>
      <Input
        placeholder="Search by name or handle"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mt-3"
      />

      {debouncedQuery.trim().length > 0 && (
        <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto">
          {contactSearchQuery.isLoading &&
            Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
              <ContactRowSkeleton key={index} />
            ))}

          {!contactSearchQuery.isLoading && searchResults.length === 0 && (
            <li className="py-4 text-center text-sm text-muted-foreground">
              No one found for &quot;{debouncedQuery}&quot;.
            </li>
          )}

          {searchResults.map((contact) => (
            <li key={contact.id} className="flex items-center gap-3 py-2">
              <ContactAvatar id={contact.id} name={contact.name} avatarUrl={contact.avatarUrl} />
              <ContactIdentity name={contact.name} handle={contact.handle} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => blockUser(contact)}
                disabled={pendingBlockContactId === contact.id}
              >
                Turn off chat
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

type ChatAvailabilitySettingsProps = {
  socket: EventSocket | null;
};

export const ChatAvailabilitySettings = ({ socket }: ChatAvailabilitySettingsProps) => {
  useChatSettingsSocket(socket);

  return (
    <div className="space-y-6">
      <ChatAvailabilityToggle />
      <ChatContactSearchSection />
      <ChatBlockedContactsSection />
    </div>
  );
};
