import { Badge, Button, Select } from "@outfiqe/design-system";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";

import {
  useSupportAgents,
  useSupportAssign,
  useSupportPriority,
  useSupportReply,
  useSupportStatus,
  useSupportTicket,
} from "./hooks";
import {
  ALLOWED_SUPPORT_TRANSITIONS,
  type SupportMessage,
  type SupportPriorityValue,
  type SupportVisibilityValue,
} from "./schemas";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  PRIORITY_VALUES,
  SEGMENT_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
} from "./support.constants";

const routeApi = getRouteApi("/_authenticated/support/$ticketId");

const AUTHOR_LABEL: Record<SupportMessage["authorKind"], string> = {
  REQUESTER: "Customer",
  STAFF: "Support",
  SYSTEM: "System",
};

const MessageBubble = ({ message }: { message: SupportMessage }) => {
  const isInternal = message.visibility === "INTERNAL";
  const isStaff = message.authorKind === "STAFF";
  return (
    <div
      className={`rounded-xl border p-3.5 ${
        isInternal
          ? "border-amber-300 bg-amber-50"
          : isStaff
            ? "border-border bg-muted"
            : "border-border bg-card"
      }`}
    >
      <p className="text-xs font-semibold text-muted-foreground">
        {message.authorName ?? AUTHOR_LABEL[message.authorKind]}
        {isInternal ? " · internal note" : ""} · {new Date(message.createdAt).toLocaleString()}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{message.body}</p>
      {message.attachmentUrls.length > 0 && (
        <ul className="mt-2 space-y-1">
          {message.attachmentUrls.map((url) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-foreground underline"
              >
                Attachment
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const SupportTicketPage = () => {
  const { ticketId } = routeApi.useParams();
  const { state } = useAuth();
  const meId = state.status === "signed-in" ? state.user.id : undefined;

  const { data: ticket, isLoading, error } = useSupportTicket(ticketId);
  const agents = useSupportAgents();
  const reply = useSupportReply(ticketId);
  const changeStatus = useSupportStatus(ticketId);
  const assign = useSupportAssign(ticketId);
  const setPriority = useSupportPriority(ticketId);

  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<SupportVisibilityValue>("PUBLIC");
  const [moveToWaiting, setMoveToWaiting] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !ticket)
    return <p className="text-sm text-destructive">Couldn&apos;t load this request.</p>;

  const submitReply = () => {
    if (!body.trim()) return;
    reply.mutate(
      {
        body: body.trim(),
        visibility,
        moveToWaitingOnCustomer: visibility === "PUBLIC" && moveToWaiting,
      },
      {
        onSuccess: () => {
          setBody("");
          setMoveToWaiting(false);
        },
      },
    );
  };

  const legalNext = ALLOWED_SUPPORT_TRANSITIONS[ticket.status];

  return (
    <div className="space-y-5">
      <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; All requests
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{ticket.reference}</span>
        <Badge tone={STATUS_TONE[ticket.status]} showDot={false}>
          {STATUS_LABELS[ticket.status]}
        </Badge>
        <Badge tone="neutral" showDot={false}>
          {SEGMENT_LABELS[ticket.segment]}
        </Badge>
      </div>
      <h1 className="font-display text-2xl font-bold text-foreground">{ticket.subject}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          {ticket.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          <div className="rounded-xl border border-border bg-card p-3.5">
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => setVisibility("PUBLIC")}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  visibility === "PUBLIC"
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground"
                }`}
              >
                Reply to customer
              </button>
              <button
                type="button"
                onClick={() => setVisibility("INTERNAL")}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  visibility === "INTERNAL"
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground"
                }`}
              >
                Internal note
              </button>
            </div>
            <textarea
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                visibility === "PUBLIC"
                  ? "This reply is emailed to the customer…"
                  : "Only the support team sees this…"
              }
              className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-sm text-foreground outline-none focus-visible:border-foreground"
            />
            {visibility === "PUBLIC" && (
              <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={moveToWaiting}
                  onChange={(event) => setMoveToWaiting(event.target.checked)}
                />
                Move to &ldquo;waiting on customer&rdquo; after sending
              </label>
            )}
            <Button
              size="sm"
              onClick={submitReply}
              disabled={reply.isPending || !body.trim()}
              className="mt-2"
            >
              {reply.isPending ? "Sending…" : visibility === "PUBLIC" ? "Send reply" : "Add note"}
            </Button>
          </div>
        </div>

        <aside className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {legalNext.map((next) => (
                <Button
                  key={next}
                  variant="outline"
                  size="sm"
                  disabled={changeStatus.isPending}
                  onClick={() =>
                    changeStatus.mutate({ status: next, expectedStatus: ticket.status })
                  }
                >
                  {STATUS_LABELS[next]}
                </Button>
              ))}
              {legalNext.length === 0 && (
                <span className="text-xs text-muted-foreground">No moves available.</span>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Assignee</p>
            <Select
              value={ticket.assigneeUserId ?? ""}
              disabled={assign.isPending}
              onChange={(event) => assign.mutate(event.target.value || null)}
              aria-label="Assignee"
            >
              <option value="">Unassigned</option>
              {meId && !agents.data?.some((agent) => agent.userId === meId) && (
                <option value={meId}>Me</option>
              )}
              {agents.data?.map((agent) => (
                <option key={agent.userId} value={agent.userId}>
                  {agent.userId === meId ? `${agent.name} (me)` : agent.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Priority</p>
            <Select
              value={ticket.priority}
              disabled={setPriority.isPending}
              onChange={(event) => setPriority.mutate(event.target.value as SupportPriorityValue)}
              aria-label="Priority"
            >
              {PRIORITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
            <p>
              <span className="text-foreground">{ticket.requesterName}</span>
              <br />
              {ticket.requesterEmail}
            </p>
            <p className="mt-2">Category: {CATEGORY_LABELS[ticket.category]}</p>
            {ticket.relatedBrandName && <p className="mt-1">Brand: {ticket.relatedBrandName}</p>}
            {ticket.relatedOrderId && <p className="mt-1">Linked to an order.</p>}
            <p className="mt-2">Opened {new Date(ticket.createdAt).toLocaleDateString()}</p>
            {ticket.firstRespondedAt && (
              <p className="mt-1">
                First reply {new Date(ticket.firstRespondedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
