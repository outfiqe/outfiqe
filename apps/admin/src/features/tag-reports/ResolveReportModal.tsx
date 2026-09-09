import { Button, Modal } from "@outfiqe/design-system";
import { useId, useState } from "react";

import type { ResolveTagReportInput, TagReport } from "./schemas";

type ResolveReportModalProps = {
  report: TagReport;
  isPending: boolean;
  errorMessage: string | null;
  onConfirm: (input: ResolveTagReportInput) => void;
  onCancel: () => void;
};

const NOTE_MAX = 500;

export const ResolveReportModal = ({
  report,
  isPending,
  errorMessage,
  onConfirm,
  onCancel,
}: ResolveReportModalProps) => {
  const noteId = useId();
  const tagIsLive = report.tag.reviewStatus === "APPROVED";
  const [action, setAction] = useState<"ACTIONED" | "DISMISSED">(
    tagIsLive ? "ACTIONED" : "DISMISSED",
  );
  const [takeDownTag, setTakeDownTag] = useState(tagIsLive);
  const [note, setNote] = useState("");

  const confirm = () => {
    onConfirm({
      status: action,
      resolutionNote: note.trim() ? note.trim() : undefined,
      takeDownTag: tagIsLive && action === "ACTIONED" ? takeDownTag : false,
    });
  };

  return (
    <Modal
      open
      onClose={onCancel}
      title="Resolve report"
      description={`${report.tag.product.name} tagged by @${report.tag.creator.handle}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={isPending}>
            {isPending ? "Saving…" : "Resolve"}
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
              name="tag-report-action"
              checked={action === "ACTIONED"}
              onChange={() => setAction("ACTIONED")}
              className="mt-0.5"
            />
            <span>
              Actioned
              <span className="block text-xs text-muted-foreground">
                The report was valid and you did something about it.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="radio"
              name="tag-report-action"
              checked={action === "DISMISSED"}
              onChange={() => setAction("DISMISSED")}
              className="mt-0.5"
            />
            <span>
              Dismissed
              <span className="block text-xs text-muted-foreground">
                No issue — the tag stays as it is.
              </span>
            </span>
          </label>
        </fieldset>

        {tagIsLive && action === "ACTIONED" && (
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={takeDownTag}
              onChange={(event) => setTakeDownTag(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              Remove this tag from the creator&apos;s look
              <span className="block text-xs text-muted-foreground">
                Revokes the live tag now. The creator is notified.
              </span>
            </span>
          </label>
        )}
        {!tagIsLive && (
          <p className="text-xs text-muted-foreground">
            This tag is already {report.tag.reviewStatus.toLowerCase()} — nothing to take down.
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
