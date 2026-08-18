import { CreatorStatus } from "@/features/auth/types";

import { ApplyAsCreatorButton } from "./ApplyAsCreatorButton";

type CreatorStatusGateProps = {
  creatorStatus: CreatorStatus;
  pitch: string;
};

export const CreatorStatusGate = ({ creatorStatus, pitch }: CreatorStatusGateProps) => {
  if (creatorStatus === CreatorStatus.PENDING) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="font-display text-xl font-bold text-foreground">Application under review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;re looking at your creator application. We&apos;ll email you once it&apos;s
          reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h1 className="font-display text-xl font-bold text-foreground">Become a creator</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{pitch}</p>
      {creatorStatus === CreatorStatus.REJECTED && (
        <p className="mt-2 text-sm text-muted-foreground">
          Your last application wasn&apos;t a fit. You&apos;re welcome to apply again.
        </p>
      )}
      <div className="mt-4">
        <ApplyAsCreatorButton />
      </div>
    </div>
  );
};
