import { Badge, Button, Select, Skeleton, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ConfirmModal } from "@/components/ConfirmModal";
import { useAuth } from "@/features/auth/AuthContext";
import { getErrorMessage } from "@/lib/errorMessages";

import { platformRolesApi } from "./api";
import type { PlatformMembershipStatusValue, PlatformRole, PlatformTeamMember } from "./schemas";

const TEAM_QUERY_KEY = ["platform-team"];
const ROLES_QUERY_KEY = ["platform-roles"];

type PendingRoleChange = { member: PlatformTeamMember; nextRoleId: string };

const STATUS_TONE: Record<PlatformMembershipStatusValue, "positive" | "negative"> = {
  ACTIVE: "positive",
  DEACTIVATED: "negative",
};

export const PlatformTeamSection = () => {
  const { state: authState } = useAuth();
  const viewerUserId = authState.status === "signed-in" ? authState.user.id : null;
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);

  const {
    data: members,
    isLoading,
    error,
  } = useQuery({ queryKey: TEAM_QUERY_KEY, queryFn: platformRolesApi.listTeam });
  const { data: roles } = useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: platformRolesApi.listRoles,
  });

  const changeRole = useApiMutation({
    mutationFn: ({ membershipId, roleId }: { membershipId: string; roleId: string }) =>
      platformRolesApi.updateTeamMember(membershipId, { roleId }),
    invalidateKeys: [TEAM_QUERY_KEY],
    onSuccess: () => setPendingRoleChange(null),
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const toggleStatus = useApiMutation({
    mutationFn: ({
      membershipId,
      status,
    }: {
      membershipId: string;
      status: PlatformMembershipStatusValue;
    }) => platformRolesApi.updateTeamMember(membershipId, { status }),
    invalidateKeys: [TEAM_QUERY_KEY],
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const isActing = changeRole.isPending || toggleStatus.isPending;

  const isViewersOwnRow = (member: PlatformTeamMember) =>
    viewerUserId !== null && member.userId === viewerUserId;

  const requestRoleChange = (member: PlatformTeamMember, nextRoleId: string) => {
    if (nextRoleId === member.roleId) return;
    setPendingRoleChange({ member, nextRoleId });
  };

  const pendingRoleName =
    (roles ?? []).find((role: PlatformRole) => role.id === pendingRoleChange?.nextRoleId)?.name ??
    "the selected role";

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Platform team</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Every active platform staff member and the role they hold.
      </p>

      <div className="mt-3 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}
        {!isLoading && !error && members?.length === 0 && (
          <p className="text-sm text-muted-foreground">No platform staff yet.</p>
        )}

        {members?.map((member) => (
          <div
            key={member.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-foreground">
                  {member.userName}
                </h3>
                {member.isSuperAdmin && (
                  <Badge tone="positive" showDot={false}>
                    SUPERADMIN
                  </Badge>
                )}
                <Badge tone={STATUS_TONE[member.status]} showDot={false}>
                  {member.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{member.userEmail}</p>
              {isViewersOwnRow(member) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  You can&apos;t change your own role or access — ask another co-founder.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={member.roleId}
                disabled={member.isSuperAdmin || isViewersOwnRow(member) || isActing}
                onChange={(e) => requestRoleChange(member, e.target.value)}
                className="w-40"
              >
                {(roles ?? []).map((role: PlatformRole) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={member.isSuperAdmin || isViewersOwnRow(member) || isActing}
                onClick={() =>
                  toggleStatus.mutate({
                    membershipId: member.id,
                    status: member.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE",
                  })
                }
              >
                {member.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {pendingRoleChange && (
        <ConfirmModal
          open
          title="Change platform role"
          description={`Change ${pendingRoleChange.member.userName}'s platform role to ${pendingRoleName}? This takes effect right away and changes what they can access.`}
          confirmLabel="Change role"
          pendingLabel="Saving…"
          isPending={changeRole.isPending}
          onConfirm={() =>
            changeRole.mutate({
              membershipId: pendingRoleChange.member.id,
              roleId: pendingRoleChange.nextRoleId,
            })
          }
          onCancel={() => setPendingRoleChange(null)}
        />
      )}
    </div>
  );
};
