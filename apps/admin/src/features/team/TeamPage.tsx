import { Badge, Button, FormBanner, Input } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { teamApi } from "./api";
import type { AdminInviteSummary } from "./schemas";

const STATUS_TONE: Record<AdminInviteSummary["status"], "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  ACCEPTED: "positive",
  EXPIRED: "negative",
};

export const TeamPage = () => {
  const queryClient = useQueryClient();
  const { data: invites, isLoading } = useQuery({
    queryKey: ["admin-invites"],
    queryFn: teamApi.list,
  });

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invite = useMutation({
    mutationFn: () => teamApi.invite(email, name),
    onSuccess: () => {
      setEmail("");
      setName("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-invites"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    invite.mutate();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Team</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="invite-name" className="text-xs text-muted-foreground">
            Name
          </label>
          <Input
            id="invite-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-48"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="invite-email" className="text-xs text-muted-foreground">
            Email
          </label>
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-64"
          />
        </div>
        <Button type="submit" disabled={invite.isPending}>
          {invite.isPending ? "Sending…" : "Invite admin"}
        </Button>
      </form>

      {error && <FormBanner className="mt-3">{error}</FormBanner>}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {invites?.length === 0 && <p className="text-sm text-muted-foreground">No invites yet.</p>}

        {invites?.map((invite) => (
          <div
            key={invite.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <h2 className="font-display text-base font-bold text-foreground">{invite.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{invite.email}</p>
            </div>
            <Badge tone={STATUS_TONE[invite.status]} showDot={false}>
              {invite.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
