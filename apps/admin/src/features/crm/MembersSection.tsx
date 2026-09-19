import { Badge, Button, Checkbox, FormBanner, Modal, Select, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useAuth } from "@/features/auth/AuthContext";
import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import type { MembershipStatusValue, MembershipSummary } from "./schemas";

type PendingRoleChange = { member: MembershipSummary; nextRoleId: string };

const STATUS_TONE: Record<MembershipStatusValue, "neutral" | "positive" | "negative"> = {
  ACTIVE: "positive",
  DEACTIVATED: "negative",
};

type MembersSectionProps = {
  viewerIsSuperAdmin: boolean;
  viewerPermissionKeys: string[];
  hasPendingOwnershipTransfer: boolean;
};

export const MembersSection = ({
  viewerIsSuperAdmin,
  viewerPermissionKeys,
  hasPendingOwnershipTransfer,
}: MembersSectionProps) => {
  const { state: authState } = useAuth();
  const viewerUserId = authState.status === "signed-in" ? authState.user.id : null;
  const [transferTarget, setTransferTarget] = useState<MembershipSummary | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [removeSenderMembership, setRemoveSenderMembership] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);

  const {
    data: members,
    isLoading,
    error,
  } = useQuery({ queryKey: ["crm-members"], queryFn: crmApi.listMembers });
  const { data: roles } = useQuery({ queryKey: ["crm-roles"], queryFn: crmApi.listRoles });

  const MEMBERS_INVALIDATE_KEYS = [["crm-members"], ["crm-organization"]];

  const changeRole = useApiMutation({
    mutationFn: ({ membershipId, roleId }: { membershipId: string; roleId: string }) =>
      crmApi.updateMember(membershipId, { roleId }),
    invalidateKeys: MEMBERS_INVALIDATE_KEYS,
    onSuccess: () => setPendingRoleChange(null),
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const toggleStatus = useApiMutation({
    mutationFn: ({
      membershipId,
      status,
    }: {
      membershipId: string;
      status: MembershipStatusValue;
    }) => crmApi.updateMember(membershipId, { status }),
    invalidateKeys: MEMBERS_INVALIDATE_KEYS,
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const transferOwnership = useApiMutation({
    mutationFn: (toMembershipId: string) =>
      crmApi.createOwnershipTransfer(toMembershipId, removeSenderMembership),
    invalidateKeys: [["crm-organization"]],
    onSuccess: () => setTransferTarget(null),
    onError: (mutationError) => setTransferError(getErrorMessage(mutationError)),
  });

  const isActing = changeRole.isPending || toggleStatus.isPending;

  const isViewersOwnRow = (member: MembershipSummary) =>
    viewerUserId !== null && member.userId === viewerUserId;

  const requestRoleChange = (member: MembershipSummary, nextRoleId: string) => {
    if (nextRoleId === member.roleId) return;
    setPendingRoleChange({ member, nextRoleId });
  };

  const pendingRoleName =
    roles?.find((role) => role.id === pendingRoleChange?.nextRoleId)?.name ?? "the selected role";

  const canViewerGrantRole = (role: { permissionKeys: string[] }) =>
    viewerIsSuperAdmin || role.permissionKeys.every((key) => viewerPermissionKeys.includes(key));

  const assignableRolesFor = (member: MembershipSummary) =>
    roles?.filter((role) => role.id === member.roleId || canViewerGrantRole(role)) ?? [];

  const canTransferOwnershipTo = (member: MembershipSummary) =>
    viewerIsSuperAdmin &&
    !member.isSuperAdmin &&
    member.status === "ACTIVE" &&
    !hasPendingOwnershipTransfer;

  const openTransferConfirm = (member: MembershipSummary) => {
    setTransferError(null);
    setRemoveSenderMembership(false);
    setTransferTarget(member);
  };

  const renderRow = (member: MembershipSummary) => (
    <div
      key={member.id}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-bold text-foreground">{member.userName}</h3>
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
            You can&apos;t change your own role or access — ask another admin.
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
          {assignableRolesFor(member).map((role) => (
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
        {canTransferOwnershipTo(member) && (
          <Button variant="outline" size="sm" onClick={() => openTransferConfirm(member)}>
            Transfer ownership
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Members</h2>

      <div className="mt-3 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <CardRowSkeleton
              key={index}
              textLineCount={1}
              hasSelectAction
              actions={[{ label: "Deactivate", size: "sm" }]}
            />
          ))}
        {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}
        {!isLoading && !error && members?.length === 0 && (
          <p className="text-sm text-muted-foreground">No CRM members yet.</p>
        )}

        {members?.map(renderRow)}
      </div>

      {transferTarget && (
        <Modal
          open
          onClose={() => setTransferTarget(null)}
          title="Transfer ownership"
          footer={
            <div className="space-y-3">
              {transferError && <FormBanner>{transferError}</FormBanner>}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTransferTarget(null)}
                  disabled={transferOwnership.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => transferOwnership.mutate(transferTarget.id)}
                  isLoading={transferOwnership.isPending}
                >
                  Transfer ownership
                </Button>
              </div>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Transfer ownership to <strong>{transferTarget.userName}</strong>? They&apos;ll need to
            accept before this takes effect.
          </p>
          <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={removeSenderMembership}
              onChange={(e) => setRemoveSenderMembership(e.target.checked)}
            />
            Remove my own access after this transfer
          </label>
        </Modal>
      )}

      {pendingRoleChange && (
        <ConfirmModal
          open
          title="Change member role"
          description={`Change ${pendingRoleChange.member.userName}'s role to ${pendingRoleName}? This takes effect right away and changes what they can access.`}
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
