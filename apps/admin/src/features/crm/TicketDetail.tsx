import { Badge, Button, FormBanner, Select } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { formatDateTime } from "./format.utils";
import { crmTicketsApi } from "./ticketsApi";
import { TICKET_STATUSES, type TicketStatusValue } from "./ticketsSchemas";

const TICKETS_QUERY_KEY = ["crm-tickets"];

const STATUS_TONE: Record<TicketStatusValue, "neutral" | "positive" | "negative"> = {
  OPEN: "negative",
  IN_PROGRESS: "neutral",
  RESOLVED: "positive",
  CLOSED: "positive",
};

export const TicketDetail = ({
  ticketId,
  members,
}: {
  ticketId: string;
  members: { id: string; userName: string }[];
}) => {
  const queryClient = useQueryClient();
  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-ticket", ticketId],
    queryFn: () => crmTicketsApi.getTicket(ticketId),
  });

  const [comment, setComment] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["crm-ticket", ticketId] });
    queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
  };

  const changeStatus = useMutation({
    mutationFn: (status: TicketStatusValue) => crmTicketsApi.changeStatus(ticketId, status),
    onSuccess: invalidate,
  });
  const assign = useMutation({
    mutationFn: (assigneeMembershipId: string | null) =>
      crmTicketsApi.assign(ticketId, assigneeMembershipId),
    onSuccess: invalidate,
  });
  const addComment = useMutation({
    mutationFn: () => crmTicketsApi.addComment(ticketId, comment.trim()),
    onSuccess: () => {
      setComment("");
      invalidate();
    },
  });

  const submitComment = (event: FormEvent) => {
    event.preventDefault();
    if (comment.trim().length > 0) addComment.mutate();
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading ticket…</p>;
  if (error || !ticket) return <FormBanner>{getErrorMessage(error)}</FormBanner>;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-foreground">{ticket.title}</h2>
        <Badge tone={STATUS_TONE[ticket.status]}>
          {ticket.status.replace("_", " ").toLowerCase()}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{ticket.type.toLowerCase()}</p>
      <p className="mt-3 text-sm">{ticket.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Status</span>
        {TICKET_STATUSES.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === ticket.status ? "default" : "outline"}
            disabled={status === ticket.status || changeStatus.isPending}
            onClick={() => changeStatus.mutate(status)}
          >
            {status.replace("_", " ").toLowerCase()}
          </Button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Assignee</span>
        <Select
          aria-label="Assignee"
          value={ticket.assigneeMembershipId ?? ""}
          onChange={(event) => assign.mutate(event.target.value || null)}
          className="w-56"
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.userName}
            </option>
          ))}
        </Select>
      </div>

      {(changeStatus.isError || assign.isError) && (
        <FormBanner className="mt-3">
          {getErrorMessage(changeStatus.error ?? assign.error)}
        </FormBanner>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-foreground">Comments</h3>
        {ticket.comments.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {ticket.comments.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-border p-2">
                <span className="text-xs text-muted-foreground">
                  {entry.authorName ?? "Unknown"} · {formatDateTime(entry.createdAt)}
                </span>
                <p>{entry.body}</p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submitComment} className="mt-2 flex gap-2">
          <input
            aria-label="New comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add an internal note…"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground"
          />
          <Button
            type="submit"
            size="sm"
            disabled={comment.trim().length === 0 || addComment.isPending}
          >
            Comment
          </Button>
        </form>
      </div>
    </div>
  );
};
