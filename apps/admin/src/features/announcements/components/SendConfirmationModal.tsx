import { Button, DateInput, FormBanner, Modal, Select, toast } from "@outfiqe/design-system";
import { isPastDateTimeInputValue, MS_PER_MINUTE, toDateTimeInputValue } from "@outfiqe/utils";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { announcementsApi } from "../api/announcementsApi";
import { type Announcement, AnnouncementAudience } from "../api/announcementsSchemas";

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

const isLargeAudience = (announcement: Announcement): boolean =>
  announcement.audiences.includes(AnnouncementAudience.EVERYONE) ||
  announcement.resolvedAudienceCount >= ANNOUNCEMENT_SEND_NOW_MAX_RECIPIENTS;

const defaultScheduleValue = (): string => {
  const soon = new Date(Date.now() + MIN_SCHEDULE_LEAD_MINUTES * MS_PER_MINUTE);
  return toDateTimeInputValue(soon);
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
  const isScheduling = mode === SendMode.SCHEDULE;
  const hasPastSchedule = isScheduling && isPastDateTimeInputValue(scheduledAt);
  const canSend = !isScheduling || (scheduledAt !== "" && !hasPastSchedule);

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
          <Button onClick={() => void submit()} disabled={!canSend} isLoading={isSubmitting}>
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
            <DateInput
              includesTime
              id="announcement-scheduled-at"
              min={toDateTimeInputValue()}
              aria-invalid={hasPastSchedule}
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
            {hasPastSchedule && (
              <p role="alert" className="mt-1 text-xs text-destructive">
                Choose a time in the future.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
