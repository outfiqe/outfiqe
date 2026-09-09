"use client";

import { Button, Modal, Select } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import {
  type RejectTagInput,
  rejectTagInputSchema,
  type TagReviewQueueItem,
} from "../api/tagReviewSchemas";
import { TAG_REJECTION_REASON_OPTIONS } from "../tagReview.constants";

type RejectTagModalProps = {
  item: TagReviewQueueItem;
  isSubmitting: boolean;
  submitError: unknown;
  onClose: () => void;
  onSubmit: (input: RejectTagInput) => void;
};

const NOTE_MAX = 280;
const [FIRST_REASON] = TAG_REJECTION_REASON_OPTIONS;

export const RejectTagModal = ({
  item,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: RejectTagModalProps) => {
  const isLiveTag = item.reviewStatus === "APPROVED";
  const [reason, setReason] = useState<RejectTagInput["reason"]>(FIRST_REASON?.value ?? "OTHER");
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const submit = () => {
    const parsed = rejectTagInputSchema.safeParse({
      reason,
      note: note.trim() ? note.trim() : undefined,
    });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    setFieldError(null);
    onSubmit(parsed.data);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isLiveTag ? "Remove this tag?" : "Decline this tag?"}
      description={
        isLiveTag
          ? `${item.creator.name}'s tag on ${item.product.name} will stop showing on their look and won't earn commission on future sales.`
          : `${item.creator.name} will be told why, and can request again up to 3 times.`
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={isSubmitting}
            className="border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-white"
          >
            {isSubmitting ? "Saving…" : isLiveTag ? "Remove tag" : "Decline tag"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="reject-tag-reason"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Reason
          </label>
          <Select
            id="reject-tag-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value as RejectTagInput["reason"])}
          >
            {TAG_REJECTION_REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label
            htmlFor="reject-tag-note"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Note to the creator {reason === "OTHER" ? "(required)" : "(optional)"}
          </label>
          <textarea
            id="reject-tag-note"
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What should they change before requesting again?"
            className="w-full resize-none rounded-lg border border-border bg-transparent p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {note.length}/{NOTE_MAX}
          </p>
        </div>

        {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
        {Boolean(submitError) && (
          <p className="text-xs text-destructive">{getErrorMessage(submitError)}</p>
        )}
      </div>
    </Modal>
  );
};
