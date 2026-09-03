"use client";

import { Button } from "@outfiqe/design-system";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { useMySupportRequests } from "../hooks/useSupportRequests";
import { CATEGORY_LABELS, STATUS_LABELS } from "../schemas/support.schema";
import { SupportRequestForm } from "./SupportRequestForm";
import { SupportThread } from "./SupportThread";

export const SupportRequestsView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTicketId = searchParams.get("ticket");

  const [isCreating, setIsCreating] = useState(false);
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useMySupportRequests();
  const tickets = data?.pages.flatMap((page) => page.tickets) ?? [];

  const openTicket = (id: string) => router.push(`/settings/support?ticket=${id}`);
  const closeTicket = () => router.push("/settings/support");

  if (activeTicketId) {
    return <SupportThread ticketId={activeTicketId} onBack={closeTicket} />;
  }

  if (isCreating) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setIsCreating(false)}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Your requests
        </button>
        <div className="mt-3">
          <SupportRequestForm onSubmitted={(result) => openTicket(result.id)} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Your requests</h2>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          New request
        </Button>
      </div>

      <div className="mt-4 space-y-2.5">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && tickets.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t raised any support requests yet.
          </p>
        )}

        {tickets.map((ticket) => (
          <button
            key={ticket.id}
            type="button"
            onClick={() => openTicket(ticket.id)}
            className="block w-full rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-foreground"
          >
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{ticket.reference}</span>
              <span>·</span>
              <span>{CATEGORY_LABELS[ticket.category]}</span>
              <span>·</span>
              <span>{STATUS_LABELS[ticket.status]}</span>
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{ticket.subject}</p>
          </button>
        ))}

        {hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>
    </div>
  );
};
