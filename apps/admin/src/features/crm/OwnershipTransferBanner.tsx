import { Button, FormBanner, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth/AuthContext";
import { getErrorMessage } from "@/lib/errorMessages";

import { crmApi } from "./api";
import type { Organization } from "./schemas";

export const OwnershipTransferBanner = ({ organization }: { organization: Organization }) => {
  const { state } = useAuth();
  const pendingTransfer = organization.pendingOwnershipTransfer;

  const acceptTransfer = useApiMutation({
    mutationFn: (requestId: string) => crmApi.acceptOwnershipTransfer(requestId),
    invalidateKeys: [["crm-organization"], ["crm-members"]],
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const declineTransfer = useApiMutation({
    mutationFn: (requestId: string) => crmApi.declineOwnershipTransfer(requestId),
    invalidateKeys: [["crm-organization"]],
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const revokeTransfer = useApiMutation({
    mutationFn: (requestId: string) => crmApi.revokeOwnershipTransfer(requestId),
    invalidateKeys: [["crm-organization"]],
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  if (!pendingTransfer) return null;

  const isPending = acceptTransfer.isPending || declineTransfer.isPending;
  const viewerIsRecipient =
    state.status === "signed-in" && state.user.id === pendingTransfer.toUserId;

  if (viewerIsRecipient) {
    return (
      <FormBanner tone="positive">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            You&apos;ve been asked to become the owner of {organization.name}.
            {pendingTransfer.removeSenderMembershipOnAccept &&
              " The current owner will be removed from this organization once you accept."}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => declineTransfer.mutate(pendingTransfer.id)}
            >
              Decline
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => acceptTransfer.mutate(pendingTransfer.id)}
            >
              Accept
            </Button>
          </div>
        </div>
      </FormBanner>
    );
  }

  if (organization.viewerIsSuperAdmin) {
    return (
      <FormBanner tone="neutral">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            Ownership transfer to <strong>{pendingTransfer.toUserName}</strong> is pending their
            acceptance.
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={revokeTransfer.isPending}
            onClick={() => revokeTransfer.mutate(pendingTransfer.id)}
          >
            Cancel
          </Button>
        </div>
      </FormBanner>
    );
  }

  return null;
};
