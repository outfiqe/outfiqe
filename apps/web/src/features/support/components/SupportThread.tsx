"use client";

import { Button } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useReplyToSupportRequest, useSupportRequestThread } from "../hooks/useSupportRequests";
import { STATUS_LABELS } from "../schemas/support.schema";

const AUTHOR_LABEL: Record<string, string> = {
  REQUESTER: "You",
  STAFF: "Outfiqe Support",
  SYSTEM: "Outfiqe",
};

export const SupportThread = ({ ticketId, onBack }: { ticketId: string; onBack: () => void }) => {
  const { data: ticket, isLoading, error } = useSupportRequestThread(ticketId);
  const reply = useReplyToSupportRequest(ticketId);
  const [body, setBody] = useState("");

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !ticket)
    return <p className="text-sm text-destructive">We couldn&apos;t load this request.</p>;

  const submit = () => {
    if (!body.trim()) return;
    reply.mutate(body.trim(), { onSuccess: () => setBody("") });
  };

  const isClosed = ticket.status === "CLOSED";

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        &larr; Your requests
      </button>

      <p className="mt-3 font-mono text-xs text-muted-foreground">{ticket.reference}</p>
      <h2 className="mt-1 font-display text-xl font-bold text-foreground">{ticket.subject}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{STATUS_LABELS[ticket.status]}</p>

      <div className="mt-5 space-y-3">
        {ticket.messages.map((message) => (
          <div key={message.id} className="rounded-xl border border-border bg-card p-3.5">
            <p className="text-xs font-semibold text-muted-foreground">
              {message.authorName && message.authorKind === "STAFF"
                ? "Outfiqe Support"
                : (AUTHOR_LABEL[message.authorKind] ?? "Outfiqe")}{" "}
              · {new Date(message.createdAt).toLocaleString()}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{message.body}</p>
          </div>
        ))}
      </div>

      {isClosed ? (
        <p className="mt-4 text-sm text-muted-foreground">
          This request is closed. Open a new one if you still need help.
        </p>
      ) : (
        <div className="mt-4">
          {reply.isError && (
            <p className="mb-2 text-sm text-destructive">{getErrorMessage(reply.error)}</p>
          )}
          <textarea
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Add a reply…"
            className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm text-foreground outline-none focus-visible:border-foreground"
          />
          <Button
            onClick={submit}
            disabled={reply.isPending || !body.trim()}
            className="mt-2"
            size="sm"
          >
            {reply.isPending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      )}
    </div>
  );
};
