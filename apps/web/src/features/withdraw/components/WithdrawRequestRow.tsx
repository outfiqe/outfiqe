import { RequestStatus, type WithdrawRequest } from "../api/withdrawSchemas";
import { WithdrawRequestStatusBadge } from "./WithdrawRequestStatusBadge";

type WithdrawRequestRowProps = {
  request: WithdrawRequest;
};

export const WithdrawRequestRow = ({ request }: WithdrawRequestRowProps) => {
  const { amount, status, rejectionReason, requiresSecondSignOff, createdAt } = request;

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-sm font-bold text-foreground">
            Rs. {amount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Requested {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
        <WithdrawRequestStatusBadge status={status} />
      </div>

      {status === RequestStatus.UNDER_REVIEW && requiresSecondSignOff && (
        <p className="mt-2 text-xs text-muted-foreground">
          This amount is above the standard limit and needs sign-off from two admins.
        </p>
      )}

      {status === RequestStatus.REJECTED && rejectionReason && (
        <p className="mt-2 text-xs text-destructive">{rejectionReason}</p>
      )}
    </div>
  );
};
