import { Badge, Button, Input, Select } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";

import { useSupportAgents, useSupportInbox, useSupportStats } from "./hooks";
import type { SupportInboxFilters } from "./schemas";
import {
  CATEGORY_FILTER_VALUES,
  CATEGORY_LABELS,
  SEGMENT_LABELS,
  STATUS_FILTER_VALUES,
  STATUS_LABELS,
  STATUS_TONE,
} from "./support.constants";

const relativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-xl border border-border bg-card px-4 py-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 font-display text-xl font-bold text-foreground">{value}</p>
  </div>
);

export const SupportInboxPage = () => {
  const { state } = useAuth();
  const meId = state.status === "signed-in" ? state.user.id : undefined;

  const [assigneeMode, setAssigneeMode] = useState<"all" | "me" | "unassigned">("all");
  const [status, setStatus] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState("");

  const filters: SupportInboxFilters = useMemo(
    () => ({
      status: status ? (status as SupportInboxFilters["status"]) : undefined,
      category: category ? (category as SupportInboxFilters["category"]) : undefined,
      assigneeUserId: assigneeMode === "me" ? meId : undefined,
      unassigned: assigneeMode === "unassigned" ? true : undefined,
      search: search.trim() || undefined,
    }),
    [status, category, assigneeMode, meId, search],
  );

  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSupportInbox(filters);
  const stats = useSupportStats();
  const agents = useSupportAgents();
  const agentName = (id: string | null) =>
    id ? (agents.data?.find((agent) => agent.userId === id)?.name ?? "Assigned") : null;

  const tickets = data?.pages.flatMap((page) => page.tickets) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Support requests</h1>

      {stats.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Open" value={stats.data.open} />
          <StatCard label="Unassigned" value={stats.data.unassigned} />
          <StatCard label="Awaiting us" value={stats.data.awaitingUs} />
          <StatCard
            label="Oldest waiting"
            value={
              stats.data.oldestWaitingAgeHours === null
                ? "—"
                : `${stats.data.oldestWaitingAgeHours}h`
            }
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={assigneeMode}
          onChange={(event) => setAssigneeMode(event.target.value as typeof assigneeMode)}
          className="w-40"
          aria-label="Filter by assignee"
        >
          <option value="all">All assignees</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </Select>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-44"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_FILTER_VALUES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-44"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {CATEGORY_FILTER_VALUES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </Select>
        <Input
          type="search"
          placeholder="Search subject"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-56"
        />
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load support requests.</p>}
        {!isLoading && tickets.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing matches these filters.</p>
        )}

        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            to="/support/$ticketId"
            params={{ ticketId: ticket.id }}
            className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{ticket.reference}</span>
              <Badge tone={STATUS_TONE[ticket.status]} showDot={false}>
                {STATUS_LABELS[ticket.status]}
              </Badge>
              <Badge tone="neutral" showDot={false}>
                {SEGMENT_LABELS[ticket.segment]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {CATEGORY_LABELS[ticket.category]}
              </span>
            </div>
            <p className="mt-1.5 font-display text-base font-bold text-foreground">
              {ticket.subject}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {ticket.requesterName} · {agentName(ticket.assigneeUserId) ?? "Unassigned"} ·{" "}
              {relativeTime(ticket.lastCustomerAt ?? ticket.updatedAt)}
            </p>
          </Link>
        ))}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-auto"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>
    </div>
  );
};
