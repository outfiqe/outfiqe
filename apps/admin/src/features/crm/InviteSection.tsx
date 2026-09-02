import { Badge, Button, FormBanner, Input, Select, toast } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import type { OrganizationInviteStatusValue } from "./schemas";

const STATUS_TONE: Record<OrganizationInviteStatusValue, "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  ACCEPTED: "positive",
  REVOKED: "negative",
  EXPIRED: "negative",
};

export const InviteSection = () => {
  const queryClient = useQueryClient();

  const {
    data: invites,
    isLoading,
    error,
  } = useQuery({ queryKey: ["crm-invites"], queryFn: crmApi.listInvites });
  const { data: roles } = useQuery({ queryKey: ["crm-roles"], queryFn: crmApi.listRoles });

  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const invalidateInvites = () => queryClient.invalidateQueries({ queryKey: ["crm-invites"] });

  const invite = useMutation({
    mutationFn: () => crmApi.createInvite(email, roleId),
    onSuccess: () => {
      setEmail("");
      setFormError(null);
      invalidateInvites();
    },
    onError: (mutationError) => setFormError(getErrorMessage(mutationError)),
  });

  const revoke = useMutation({
    mutationFn: (inviteId: string) => crmApi.revokeInvite(inviteId),
    onSuccess: invalidateInvites,
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!roleId) {
      setFormError("Choose a role for this invite.");
      return;
    }
    invite.mutate();
  };

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Invite a staff member</h2>

      <form
        onSubmit={handleSubmit}
        className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="crm-invite-email" className="text-xs text-muted-foreground">
            Email
          </label>
          <Input
            id="crm-invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-64"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="crm-invite-role" className="text-xs text-muted-foreground">
            Role
          </label>
          <Select
            id="crm-invite-role"
            required
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="w-40"
          >
            <option value="" disabled>
              Select a role
            </option>
            {roles?.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={invite.isPending}>
          {invite.isPending ? "Sending…" : "Send invite"}
        </Button>
      </form>

      <p className="mt-2 text-xs text-muted-foreground">
        If they don&rsquo;t have an Outfiqe account yet, they&rsquo;ll set a name and password from
        the invite email before joining.
      </p>

      {formError && <FormBanner className="mt-3">{formError}</FormBanner>}

      <h3 className="mt-6 font-display text-base font-bold text-foreground">Pending invites</h3>
      <div className="mt-3 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}
        {!isLoading && !error && invites?.length === 0 && (
          <p className="text-sm text-muted-foreground">No invites yet.</p>
        )}

        {invites?.map((pendingInvite) => (
          <div
            key={pendingInvite.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display text-sm font-bold text-foreground">
                  {pendingInvite.email}
                </h4>
                <Badge tone={STATUS_TONE[pendingInvite.status]} showDot={false}>
                  {pendingInvite.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{pendingInvite.roleName}</p>
            </div>

            {pendingInvite.status === "PENDING" && (
              <Button
                variant="outline"
                size="sm"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(pendingInvite.id)}
              >
                Revoke
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
