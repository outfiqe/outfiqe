import { Skeleton } from "@outfiqe/design-system";

import type { WithdrawEligibility, WithdrawPolicy } from "../api/withdrawSchemas";

type WithdrawPolicyPanelProps = {
  policy: WithdrawPolicy | undefined;
  eligibility: WithdrawEligibility | undefined;
  isLoading: boolean;
};

export const WithdrawPolicyPanel = ({
  policy,
  eligibility,
  isLoading,
}: WithdrawPolicyPanelProps) => {
  if (isLoading || !policy || !eligibility) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
    );
  }

  const { minAmount, maxAmount, processingNoteText } = policy;
  const {
    windowOpen,
    nextWindowOpensAt,
    attemptsRemaining,
    availableBalance,
    cooldownActive,
    cooldownEndsAt,
  } = eligibility;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">Available balance</p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">
        Rs. {availableBalance.toLocaleString()}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Withdrawal limits</dt>
          <dd className="mt-0.5 text-foreground">
            Rs. {minAmount.toLocaleString()} – Rs. {maxAmount.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Attempts left this window</dt>
          <dd className="mt-0.5 text-foreground">{attemptsRemaining}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Window status</dt>
          <dd className="mt-0.5 text-foreground">
            {windowOpen ? "Open" : `Opens ${new Date(nextWindowOpensAt).toLocaleDateString()}`}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Processing time</dt>
          <dd className="mt-0.5 text-foreground">{processingNoteText}</dd>
        </div>
      </dl>

      {cooldownActive && cooldownEndsAt && (
        <p className="mt-4 text-xs text-muted-foreground">
          You&apos;re in a cooldown period after a recent rejection until{" "}
          {new Date(cooldownEndsAt).toLocaleDateString()}.
        </p>
      )}
    </div>
  );
};
