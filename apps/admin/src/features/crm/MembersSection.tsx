import { Badge, Button, Checkbox, FormBanner, Modal, Select, toast } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import type { MembershipStatusValue, MembershipSummary } from "./schemas";

const STATUS_TONE: Record<MembershipStatusValue, "neutral" | "positive" | "negative"> = {
  ACTIVE: "positive",
  DEACTIVATED: "negative",
};

type MembersSectionProps = {
  viewerIsSuperAdmin: boolean;
  hasPendingOwnershipTransfer: boolean;
};

export const MembersSection = ({
  viewerIsSuperAdmin,
  hasPendingOwnershipTransfer,
}: MembersSectionProps) => {
  const queryClient = useQueryClient();
  const [transferTarget, setTransferTarget] = useState<MembershipSummary | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [removeSenderMembership, setRemoveSenderMembership] = useState(false);

  const {
    data: members,
    isLoading,
    error,
  } = useQuery({ queryKey: ["crm-members"], queryFn: crmApi.listMembers });
  const { data: roles } = useQuery({ queryKey: ["crm-roles"], queryFn: crmApi.listRoles });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm-members"] });

  const changeRole = useMutation({
    mutationFn: ({ membershipId, roleId }: { membershipId: string; roleId: string }) =>
      crmApi.updateMember(membershipId, { roleId }),
    onSuccess: invalidate,
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const toggleStatus = useMutation({
    mutationFn: ({
      membershipId,
      status,
    }: {
      membershipId: string;
      status: MembershipStatusValue;
    }) => crmApi.updateMember(membershipId, { status }),
    onSuccess: invalidate,
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const transferOwnership = useMutation({
    mutationFn: (toMembershipId: string) =>
      crmApi.createOwnershipTransfer(toMembershipId, removeSenderMembership),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-organization"] });
      setTransferTarget(null);
    },
    onError: (mutationError) => setTransferError(getErrorMessage(mutationError)),
  });

  const isActing = changeRole.isPending || toggleStatus.isPending;

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
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={member.roleId}
          disabled={member.isSuperAdmin || isActing}
          onChange={(e) => changeRole.mutate({ membershipId: member.id, roleId: e.target.value })}
          className="w-40"
        >
          {roles?.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={member.isSuperAdmin || isActing}
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
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
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
                  disabled={transferOwnership.isPending}
                >
                  {transferOwnership.isPending ? "Requesting…" : "Transfer ownership"}
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
    </div>
  );
};
