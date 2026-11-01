import { Button, Input } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { type FormEvent, useState } from "react";

import { MetricEmptyState, MetricSection } from "@/components/MetricParts";
import { getErrorMessage } from "@/lib/errorMessages";

import { formatDateTime } from "../../utils/format.utils";
import { crmTicketsApi } from "../api/ticketsApi";
import type { TicketWithComments } from "../api/ticketsSchemas";
import { TICKETS_QUERY_KEY, toTicketQueryKey } from "../constants/ticketQueryKeys";

export const TicketCommentsSection = ({
  ticket,
  canWrite,
}: {
  ticket: TicketWithComments;
  canWrite: boolean;
}) => {
  const { id: ticketId, comments } = ticket;
  const [comment, setComment] = useState("");

  const addComment = useApiMutation({
    mutationFn: () => crmTicketsApi.addComment(ticketId, comment.trim()),
    invalidateKeys: [toTicketQueryKey(ticketId), TICKETS_QUERY_KEY],
    errorMessage: getErrorMessage,
    onSuccess: () => setComment(""),
  });

  const submitComment = (event: FormEvent) => {
    event.preventDefault();
    if (comment.trim().length > 0) addComment.mutate();
  };

  return (
    <MetricSection title="Comments" description="Notes for your team while you work on this.">
      {comments.length === 0 ? (
        <MetricEmptyState>No comments yet.</MetricEmptyState>
      ) : (
        <ul className="space-y-2 text-sm">
          {comments.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-border p-3">
              <span className="text-xs text-muted-foreground">
                {entry.authorName ?? "Unknown"} · {formatDateTime(entry.createdAt)}
              </span>
              <p className="mt-1 whitespace-pre-wrap text-foreground">{entry.body}</p>
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form onSubmit={submitComment} className="mt-3 flex gap-2">
          <Input
            aria-label="New comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add an internal note…"
            className="min-w-0 flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={comment.trim().length === 0 || addComment.isPending}
          >
            Comment
          </Button>
        </form>
      )}
    </MetricSection>
  );
};
