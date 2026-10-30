import { toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useAuth } from "@/features/auth/components/AuthContext";
import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "../api/crmApi";
import type { MembershipStatusValue, MembershipSummary } from "../api/crmSchemas";

const MEMBERS_INVALIDATE_KEYS = [["crm-members"], ["crm-organization"]];

type PendingRoleChange = { member: MembershipSummary; nextRoleId: string };

export type MemberActionsOptions = {
  viewerIsSuperAdmin: boolean;
  viewerPermissionKeys: string[];
  hasPendingOwnershipTransfer: boolean;
};

export const useMemberActions = ({
  viewerIsSuperAdmin,
  viewerPermissionKeys,
  hasPendingOwnershipTransfer,
}: MemberActionsOptions) => {
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

  return {
    members,
    isLoading,
    error,
    transferTarget,
    setTransferTarget,
    transferError,
    removeSenderMembership,
    setRemoveSenderMembership,
    pendingRoleChange,
    setPendingRoleChange,
    pendingRoleName,
    changeRole,
    toggleStatus,
    transferOwnership,
    isActing,
    isViewersOwnRow,
    requestRoleChange,
    assignableRolesFor,
    canTransferOwnershipTo,
    openTransferConfirm,
  };
};
