"use client";

import { Button, Modal } from "@outfiqe/design-system";
import { useId, useState } from "react";

import type { ContentReportReasonValue } from "../api/exploreFeedSchemas";

type ReportContentModalProps = {
  targetLabel: "post" | "comment";
  isPending: boolean;
  onConfirm: (input: { reason: ContentReportReasonValue; note?: string }) => void;
  onCancel: () => void;
};

const REASON_OPTIONS: { value: ContentReportReasonValue; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT_OR_BULLYING", label: "Harassment or bullying" },
  { value: "HATE_SPEECH", label: "Hate speech" },
  { value: "NUDITY_OR_SEXUAL_CONTENT", label: "Nudity or sexual content" },
  { value: "VIOLENCE_OR_DANGEROUS_ACTS", label: "Violence or dangerous acts" },
  { value: "SCAM_OR_MISLEADING", label: "Scam or misleading" },
  { value: "INTELLECTUAL_PROPERTY", label: "Intellectual property" },
  { value: "OTHER", label: "Something else" },
];

const NOTE_MAX = 500;

export const ReportContentModal = ({
  targetLabel,
  isPending,
  onConfirm,
  onCancel,
}: ReportContentModalProps) => {
  const noteId = useId();
  const [reason, setReason] = useState<ContentReportReasonValue>("SPAM");
  const [note, setNote] = useState("");

  const noteRequired = reason === "OTHER";
  const canSubmit = !noteRequired || note.trim().length > 0;

  return (
    <Modal
      open
      onClose={onCancel}
      title={`Report this ${targetLabel}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm({ reason, note: note.trim() ? note.trim() : undefined })}
            disabled={!canSubmit}
            isLoading={isPending}
          >
            Report
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">What&apos;s wrong?</legend>
          {REASON_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="content-report-reason"
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor={noteId} className="mb-1.5 block text-sm font-medium text-foreground">
            {noteRequired ? "Tell us more" : "Add a note (optional)"}
          </label>
          <textarea
            id={noteId}
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What did you see?"
            className="w-full resize-none rounded-lg border border-border bg-transparent p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
    </Modal>
  );
};
