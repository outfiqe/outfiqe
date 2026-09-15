import { Button, Modal } from "@outfiqe/design-system";
import { useId, useState } from "react";

import type { ContentReport, ResolveContentReportInput } from "./schemas";

type ResolveContentReportModalProps = {
  report: ContentReport;
  isPending: boolean;
  errorMessage: string | null;
  onConfirm: (input: ResolveContentReportInput) => void;
  onCancel: () => void;
};

const NOTE_MAX = 500;

export const ResolveContentReportModal = ({
  report,
  isPending,
  errorMessage,
  onConfirm,
  onCancel,
}: ResolveContentReportModalProps) => {
  const noteId = useId();
  const targetNoun = report.targetType === "CREATOR_LOOK" ? "post" : "comment";
  const contentIsLive = report.target !== null && !report.target.isRemoved;
  const [action, setAction] = useState<"REMOVE_CONTENT" | "DISMISS">(
    contentIsLive ? "REMOVE_CONTENT" : "DISMISS",
  );
  const [note, setNote] = useState("");

  const confirm = () => {
    onConfirm({ action, note: note.trim() ? note.trim() : undefined });
  };

  return (
    <Modal
      open
      onClose={onCancel}
      title="Resolve report"
      description={report.target ? `Posted by @${report.target.author.handle}` : undefined}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={confirm} isLoading={isPending}>
            Resolve
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">Outcome</legend>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="radio"
              name="content-report-action"
              checked={action === "REMOVE_CONTENT"}
              onChange={() => setAction("REMOVE_CONTENT")}
              disabled={!contentIsLive}
              className="mt-0.5"
            />
            <span>
              Remove content
              <span className="block text-xs text-muted-foreground">
                Takes this {targetNoun} down now. The author is notified.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="radio"
              name="content-report-action"
              checked={action === "DISMISS"}
              onChange={() => setAction("DISMISS")}
              className="mt-0.5"
            />
            <span>
              Dismiss
              <span className="block text-xs text-muted-foreground">
                No issue — this {targetNoun} stays up.
              </span>
            </span>
          </label>
        </fieldset>

        {!contentIsLive && (
          <p className="text-xs text-muted-foreground">
            This {targetNoun} has already been removed — nothing left to take down.
          </p>
        )}

        <div>
          <label htmlFor={noteId} className="mb-1.5 block text-sm font-medium text-foreground">
            Resolution note (optional)
          </label>
          <textarea
            id={noteId}
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What did you find, and what did you do?"
            className="w-full resize-none rounded-lg border border-border bg-transparent p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
      </div>
    </Modal>
  );
};
