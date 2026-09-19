import { Badge, Button, FormBanner, Input, Select, Skeleton } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { platformRolesApi } from "@/features/platform-roles/api";
import { PlatformRolesSection } from "@/features/platform-roles/PlatformRolesSection";
import { PlatformTeamSection } from "@/features/platform-roles/PlatformTeamSection";

import { teamApi } from "./api";
import type { AdminInviteSummary } from "./schemas";

const STATUS_TONE: Record<AdminInviteSummary["status"], "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  ACCEPTED: "positive",
  EXPIRED: "negative",
};

export const TeamPage = () => {
  const { state: authState } = useAuth();
  const isCoFounder = authState.status === "signed-in" && authState.user.isCoFounder;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-invites"],
    queryFn: teamApi.list,
  });
  const invites = data?.invites;

  const { data: roles } = useQuery({
    queryKey: ["platform-roles"],
    queryFn: platformRolesApi.listRoles,
    enabled: isCoFounder,
  });

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invite = useApiMutation({
    mutationFn: () => teamApi.invite(email, name, roleId),
    invalidateKeys: [["admin-invites"]],
    onSuccess: () => {
      setEmail("");
      setName("");
      setRoleId("");
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!roleId) {
      setError("Choose a platform role for this invite.");
      return;
    }
    invite.mutate();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Team</h1>

        {isCoFounder ? (
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
            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-xs text-muted-foreground">
                Role
              </label>
              <Select
                id="invite-role"
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
            <Button type="submit" isLoading={invite.isPending}>
              Invite admin
            </Button>
          </form>
        ) : (
          !isLoading && (
            <p className="mt-5 text-sm text-muted-foreground">
              You don&rsquo;t have permission to invite new admins.
            </p>
          )
        )}

        {error && <FormBanner className="mt-3">{error}</FormBanner>}

        <div className="mt-6 space-y-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))}
          {invites?.length === 0 && (
            <p className="text-sm text-muted-foreground">No invites yet.</p>
          )}

          {invites?.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <h2 className="flex flex-wrap items-center gap-2 font-display text-base font-bold text-foreground">
                  {invite.name}
                  {invite.isCoFounder && (
                    <Badge tone="positive" showDot={false} className="text-[10px]">
                      Co-founder
                    </Badge>
                  )}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{invite.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{invite.roleName}</p>
              </div>
              <Badge tone={STATUS_TONE[invite.status]} showDot={false}>
                {invite.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {isCoFounder && (
        <>
          <PlatformRolesSection />
          <PlatformTeamSection />
        </>
      )}
    </div>
  );
};
