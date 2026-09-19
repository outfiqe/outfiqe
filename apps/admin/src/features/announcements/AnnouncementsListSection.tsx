import { Badge, Button, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";
import { oneOfFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { announcementsApi } from "./api";
import { ComposeAnnouncementModal } from "./ComposeAnnouncementModal";
import { useInfiniteAnnouncements } from "./hooks/useInfiniteAnnouncements";
import {
  type Announcement,
  AnnouncementAudience,
  type AnnouncementAudienceValue,
  AnnouncementStatus,
  type AnnouncementStatusValue,
} from "./schemas";
import { SendConfirmationModal } from "./SendConfirmationModal";

const NEW_ANNOUNCEMENT_TARGET = "new" as const;
type ComposeTarget = Announcement | typeof NEW_ANNOUNCEMENT_TARGET;

const DEFAULT_ANNOUNCEMENT_STATUS: AnnouncementStatusValue = AnnouncementStatus.DRAFT;
const TABS: AnnouncementStatusValue[] = [
  AnnouncementStatus.DRAFT,
  AnnouncementStatus.SCHEDULED,
  AnnouncementStatus.SENDING,
  AnnouncementStatus.SENT,
  AnnouncementStatus.CANCELED,
];
const ANNOUNCEMENT_STATUS_FILTER = oneOfFilter<AnnouncementStatusValue>(
  TABS,
  DEFAULT_ANNOUNCEMENT_STATUS,
);

const STATUS_TONE: Record<AnnouncementStatusValue, "neutral" | "positive" | "negative"> = {
  [AnnouncementStatus.DRAFT]: "neutral",
  [AnnouncementStatus.SCHEDULED]: "positive",
  [AnnouncementStatus.SENDING]: "positive",
  [AnnouncementStatus.SENT]: "positive",
  [AnnouncementStatus.CANCELED]: "negative",
};

const AUDIENCE_LABELS: Record<AnnouncementAudienceValue, string> = {
  [AnnouncementAudience.EVERYONE]: "Everyone",
  [AnnouncementAudience.CUSTOMERS]: "Customers",
  [AnnouncementAudience.APPROVED_CREATORS]: "Approved creators",
  [AnnouncementAudience.BRAND_OWNERS]: "Brand owners",
  [AnnouncementAudience.STAFF]: "Staff",
};

const describeAudience = (announcement: Announcement): string =>
  announcement.audiences.map((audience) => AUDIENCE_LABELS[audience]).join(", ");

const formatDateTime = (value: string | null): string =>
  value ? new Date(value).toLocaleString() : "—";

export const AnnouncementsListSection = () => {
  const [tab, setTab] = useSearchFilter("status", ANNOUNCEMENT_STATUS_FILTER);
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null);
  const [sendTarget, setSendTarget] = useState<Announcement | null>(null);
  const queryClient = useQueryClient();

  const {
    data: announcementsQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteAnnouncements(tab);
  const announcements = announcementsQuery?.pages.flatMap((page) => page.announcements) ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });

  const cancelAnnouncement = useApiMutation({
    mutationFn: (id: string) => announcementsApi.cancel(id),
    invalidateKeys: [["admin-announcements"]],
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const closeCompose = () => setComposeTarget(null);
  const closeSend = () => setSendTarget(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((status) => (
            <button
              key={status}
              onClick={() => setTab(status)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === status
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setComposeTarget(NEW_ANNOUNCEMENT_TARGET)}>
          New announcement
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <CardRowSkeleton
              key={index}
              textLineCount={1}
              hasMetaLine
              actionCount={2}
              hasSpacedSections
            />
          ))}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load announcements.</p>}
        {!isLoading && announcements.length === 0 && (
          <p className="text-sm text-muted-foreground">No announcements here yet.</p>
        )}

        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="space-y-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {announcement.title}
                  </h3>
                  <Badge tone={STATUS_TONE[announcement.status]} showDot={false}>
                    {announcement.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{announcement.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {describeAudience(announcement)} · ~
                  {announcement.resolvedAudienceCount.toLocaleString()} people
                  {announcement.status === AnnouncementStatus.SCHEDULED &&
                    ` · sends ${formatDateTime(announcement.scheduledAt)}`}
                  {announcement.status === AnnouncementStatus.SENDING && " · sending now…"}
                  {announcement.status === AnnouncementStatus.SENT &&
                    ` · sent to ${(announcement.recipientCount ?? 0).toLocaleString()} people on ${formatDateTime(announcement.sentAt)}`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {announcement.status === AnnouncementStatus.DRAFT && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setComposeTarget(announcement)}
                    >
                      Edit
                    </Button>
                    <Button size="sm" onClick={() => setSendTarget(announcement)}>
                      Send
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelAnnouncement.mutate(announcement.id)}
                      disabled={cancelAnnouncement.isPending}
                    >
                      Discard
                    </Button>
                  </>
                )}
                {announcement.status === AnnouncementStatus.SCHEDULED && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelAnnouncement.mutate(announcement.id)}
                    disabled={cancelAnnouncement.isPending}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            isLoading={isFetchingNextPage}
            className="mx-auto"
          >
            Load more
          </Button>
        )}
      </div>

      {composeTarget !== null && (
        <ComposeAnnouncementModal
          key={
            composeTarget === NEW_ANNOUNCEMENT_TARGET ? NEW_ANNOUNCEMENT_TARGET : composeTarget.id
          }
          announcement={composeTarget === NEW_ANNOUNCEMENT_TARGET ? null : composeTarget}
          onClose={closeCompose}
          onSaved={async () => {
            await invalidate();
            closeCompose();
          }}
        />
      )}
      {sendTarget && (
        <SendConfirmationModal
          key={sendTarget.id}
          announcement={sendTarget}
          onClose={closeSend}
          onSent={async () => {
            await invalidate();
            closeSend();
          }}
        />
      )}
    </div>
  );
};
