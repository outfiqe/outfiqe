import { Button, Input, Modal, MultiSelect, Select, Textarea, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { announcementsApi } from "./api";
import {
  type Announcement,
  AnnouncementAudience,
  type AnnouncementAudienceValue,
  NotificationSurface,
  type NotificationSurfaceValue,
} from "./schemas";

const CtaMode = {
  NONE: "none",
  INTERNAL: "internal",
  EXTERNAL: "external",
} as const;
type CtaModeValue = (typeof CtaMode)[keyof typeof CtaMode];

type ComposeAnnouncementModalProps = {
  announcement: Announcement | null;
  onClose: () => void;
  onSaved: () => void;
};

const AUDIENCE_OPTIONS: { value: AnnouncementAudienceValue; label: string }[] = [
  { value: AnnouncementAudience.EVERYONE, label: "Everyone" },
  { value: AnnouncementAudience.CUSTOMERS, label: "Customers" },
  { value: AnnouncementAudience.APPROVED_CREATORS, label: "Approved creators" },
  { value: AnnouncementAudience.BRAND_OWNERS, label: "Brand owners" },
  { value: AnnouncementAudience.STAFF, label: "Staff" },
];

const resolveCtaMode = (announcement: Announcement | null): CtaModeValue => {
  if (!announcement?.targetPath) return CtaMode.NONE;
  return announcement.targetSurface ? CtaMode.INTERNAL : CtaMode.EXTERNAL;
};

export const ComposeAnnouncementModal = ({
  announcement,
  onClose,
  onSaved,
}: ComposeAnnouncementModalProps) => {
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [audiences, setAudiences] = useState<AnnouncementAudienceValue[]>(
    announcement?.audiences ?? [],
  );
  const [ctaMode, setCtaMode] = useState<CtaModeValue>(resolveCtaMode(announcement));
  const [targetSurface, setTargetSurface] = useState<NotificationSurfaceValue>(
    announcement?.targetSurface ?? NotificationSurface.WEB,
  );
  const [targetPath, setTargetPath] = useState(announcement?.targetPath ?? "");
  const [expiresAt, setExpiresAt] = useState(announcement?.expiresAt?.slice(0, 10) ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvedAudienceCount, setResolvedAudienceCount] = useState<number | null>(
    announcement?.resolvedAudienceCount ?? null,
  );

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const input = {
        title,
        body,
        audiences,
        targetSurface: ctaMode === CtaMode.INTERNAL ? targetSurface : null,
        targetPath: ctaMode === CtaMode.NONE ? null : targetPath,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      const saved = announcement
        ? await announcementsApi.update(announcement.id, input)
        : await announcementsApi.create(input);

      setResolvedAudienceCount(saved.resolvedAudienceCount);
      toast.success(announcement ? "Announcement updated" : "Announcement drafted");
      onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    audiences.length > 0 &&
    (ctaMode === CtaMode.NONE || targetPath.trim().length > 0);

  return (
    <Modal
      open
      onClose={onClose}
      title={announcement ? "Edit draft" : "New announcement"}
      description="Shows up as an ordinary card in every recipient's notification bell."
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {resolvedAudienceCount !== null
              ? `Resolves to approximately ${resolvedAudienceCount.toLocaleString()} people`
              : "Save to see how many people this reaches"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => void submit()} disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? "Saving…" : "Save draft"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            htmlFor="announcement-title"
          >
            Title
          </label>
          <Input
            id="announcement-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Tomorrow's livestream event"
          />
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            htmlFor="announcement-body"
          >
            Body
          </label>
          <Textarea
            id="announcement-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Join us tomorrow at 6pm for a live drop with our top creators."
          />
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            htmlFor="announcement-audiences"
          >
            Audience
          </label>
          <MultiSelect
            id="announcement-audiences"
            options={AUDIENCE_OPTIONS}
            value={audiences}
            onChange={(next) => setAudiences(next as AnnouncementAudienceValue[])}
            placeholder="Add a segment…"
          />
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            htmlFor="announcement-cta-mode"
          >
            Call to action
          </label>
          <Select
            id="announcement-cta-mode"
            value={ctaMode}
            onChange={(event) => setCtaMode(event.target.value as CtaModeValue)}
          >
            <option value={CtaMode.NONE}>No call-to-action</option>
            <option value={CtaMode.INTERNAL}>Internal page</option>
            <option value={CtaMode.EXTERNAL}>External link</option>
          </Select>
        </div>

        {ctaMode === CtaMode.INTERNAL && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-foreground"
                htmlFor="announcement-surface"
              >
                App
              </label>
              <Select
                id="announcement-surface"
                value={targetSurface}
                onChange={(event) =>
                  setTargetSurface(event.target.value as NotificationSurfaceValue)
                }
              >
                <option value={NotificationSurface.WEB}>Customer app</option>
                <option value={NotificationSurface.ADMIN}>Admin dashboard</option>
              </Select>
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-foreground"
                htmlFor="announcement-path"
              >
                Path
              </label>
              <Input
                id="announcement-path"
                value={targetPath}
                onChange={(event) => setTargetPath(event.target.value)}
                placeholder="/events/spring-drop"
              />
            </div>
          </div>
        )}

        {ctaMode === CtaMode.EXTERNAL && (
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-foreground"
              htmlFor="announcement-url"
            >
              Link
            </label>
            <Input
              id="announcement-url"
              value={targetPath}
              onChange={(event) => setTargetPath(event.target.value)}
              placeholder="https://forms.gle/..."
            />
          </div>
        )}

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            htmlFor="announcement-expires-at"
          >
            Expires on (optional)
          </label>
          <Input
            id="announcement-expires-at"
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            After this date the call-to-action stops working; the card stays in people&apos;s
            history.
          </p>
        </div>
      </div>
    </Modal>
  );
};
