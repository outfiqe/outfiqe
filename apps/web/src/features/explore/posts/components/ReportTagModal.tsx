"use client";

import { Button, Modal } from "@outfiqe/design-system";
import { useId, useState } from "react";

import type { FeedTaggedProduct, TagReportReasonValue } from "../../feed/api/exploreFeedSchemas";

type ReportTagModalProps = {
  taggedProducts: FeedTaggedProduct[];
  isPending: boolean;
  onConfirm: (input: { productId: string; reason: TagReportReasonValue; note?: string }) => void;
  onCancel: () => void;
};

const REASON_OPTIONS: { value: TagReportReasonValue; label: string }[] = [
  { value: "COUNTERFEIT", label: "It looks like a fake copy" },
  { value: "NOT_GENUINELY_WORN", label: "They're not really wearing it" },
  { value: "MISLEADING", label: "The tag is for a different product" },
  { value: "OFFENSIVE", label: "It's offensive" },
  { value: "OTHER", label: "Something else" },
];

const NOTE_MAX = 500;
const FIRST_TAG_INDEX = 0;

export const ReportTagModal = ({
  taggedProducts,
  isPending,
  onConfirm,
  onCancel,
}: ReportTagModalProps) => {
  const noteId = useId();
  const [productId, setProductId] = useState(taggedProducts[FIRST_TAG_INDEX]?.id ?? "");
  const [reason, setReason] = useState<TagReportReasonValue>("COUNTERFEIT");
  const [note, setNote] = useState("");

  const isNoteRequired = reason === "OTHER";
  const trimmedNote = note.trim();
  const canSubmit = Boolean(productId) && (!isNoteRequired || trimmedNote.length > 0);

  return (
    <Modal
      open
      onClose={onCancel}
      title="Report a tag"
      description="Tell us which tagged piece looks wrong. Our team checks every report."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="cursor-pointer" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="cursor-pointer"
            onClick={() => onConfirm({ productId, reason, note: trimmedNote || undefined })}
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
          <legend className="text-sm font-medium text-foreground">Which tag?</legend>
          {taggedProducts.map((taggedProduct) => (
            <label
              key={taggedProduct.id}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <input
                type="radio"
                name="tag-report-product"
                checked={productId === taggedProduct.id}
                onChange={() => setProductId(taggedProduct.id)}
              />
              <span className="truncate">
                {taggedProduct.name}
                <span className="text-muted-foreground"> · {taggedProduct.brand}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">What&apos;s wrong?</legend>
          {REASON_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="tag-report-reason"
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor={noteId} className="mb-1.5 block text-sm font-medium text-foreground">
            {isNoteRequired ? "Tell us more" : "Add a note (optional)"}
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
