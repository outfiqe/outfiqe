import { CreatorStatus } from "@/features/auth/types";
import { ApplyAsCreatorButton } from "./ApplyAsCreatorButton";
import { LooksSection } from "./LooksSection";
import type { CreatorProfile } from "../api/creatorDashboardSchemas";

export function CreatorDashboard({ profile }: { profile: CreatorProfile }) {
  if (profile.creatorStatus === CreatorStatus.APPROVED) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Approved creator
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold text-foreground">{profile.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <LooksSection />
      </div>
    );
  }

  if (profile.creatorStatus === CreatorStatus.PENDING) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold text-foreground">Application under review</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;re looking at your creator application. We&apos;ll email you once it&apos;s
          reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-bold text-foreground">Become a creator</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Post your fits, tag the pieces you&apos;re wearing, and get credit when someone buys through
        your post.
      </p>
      {profile.creatorStatus === CreatorStatus.REJECTED && (
        <p className="mt-2 text-sm text-muted-foreground">
          Your last application wasn&apos;t a fit. You&apos;re welcome to apply again.
        </p>
      )}
      <div className="mt-4">
        <ApplyAsCreatorButton />
      </div>
    </div>
  );
}
