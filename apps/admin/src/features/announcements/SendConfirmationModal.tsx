import { Button, FormBanner, Input, Modal, Select, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { announcementsApi } from "./api";
import { type Announcement, AnnouncementAudience } from "./schemas";

type SendConfirmationModalProps = {
  announcement: Announcement;
  onClose: () => void;
  onSent: () => Promise<unknown>;
};

const SendMode = {
  NOW: "now",
  SCHEDULE: "schedule",
} as const;
type SendModeValue = (typeof SendMode)[keyof typeof SendMode];

const ANNOUNCEMENT_SEND_NOW_MAX_RECIPIENTS = 500;
const MIN_SCHEDULE_LEAD_MINUTES = 5;
const MS_PER_MINUTE = 60 * 1000;

const isLargeAudience = (announcement: Announcement): boolean =>
  announcement.audiences.includes(AnnouncementAudience.EVERYONE) ||
  announcement.resolvedAudienceCount >= ANNOUNCEMENT_SEND_NOW_MAX_RECIPIENTS;

const defaultScheduleValue = (): string => {
  const soon = new Date(Date.now() + MIN_SCHEDULE_LEAD_MINUTES * MS_PER_MINUTE);
  soon.setSeconds(0, 0);
  const localSoon = new Date(soon.getTime() - soon.getTimezoneOffset() * MS_PER_MINUTE);
  return localSoon.toISOString().slice(0, 16);
};

export const SendConfirmationModal = ({
  announcement,
  onClose,
  onSent,
}: SendConfirmationModalProps) => {
  const forcedToSchedule = isLargeAudience(announcement);
  const [mode, setMode] = useState<SendModeValue>(
    forcedToSchedule ? SendMode.SCHEDULE : SendMode.NOW,
  );
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleValue());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    try {
      await announcementsApi.send(announcement.id, {
        scheduledAt: mode === SendMode.SCHEDULE ? new Date(scheduledAt).toISOString() : undefined,
      });
      toast.success(mode === SendMode.SCHEDULE ? "Announcement scheduled" : "Announcement sent");
      await onSent();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Send — ${announcement.title}`}
      description={`This will reach approximately ${announcement.resolvedAudienceCount.toLocaleString()} people.`}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} isLoading={isSubmitting}>
            {mode === SendMode.SCHEDULE ? "Schedule" : "Send now"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {announcement.audiences.includes(AnnouncementAudience.EVERYONE) && (
          <FormBanner tone="negative">
            This goes to everyone on the platform. This can&apos;t be pulled back once sending
            starts.
          </FormBanner>
        )}
        {!announcement.audiences.includes(AnnouncementAudience.EVERYONE) && forcedToSchedule && (
          <FormBanner tone="neutral">
            This audience is too large to send immediately — it will be scheduled and dispatched by
            the background job.
          </FormBanner>
        )}

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            htmlFor="announcement-send-mode"
          >
            When
          </label>
          <Select
            id="announcement-send-mode"
            value={mode}
            onChange={(event) => setMode(event.target.value as SendModeValue)}
            disabled={forcedToSchedule}
          >
            <option value={SendMode.NOW}>Send now</option>
            <option value={SendMode.SCHEDULE}>Schedule for later</option>
          </Select>
        </div>

        {mode === SendMode.SCHEDULE && (
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-foreground"
              htmlFor="announcement-scheduled-at"
            >
              Send at
            </label>
            <Input
              id="announcement-scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
