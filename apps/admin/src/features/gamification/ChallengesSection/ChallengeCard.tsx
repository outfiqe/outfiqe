import { Button } from "@outfiqe/design-system";

import type { ChallengeAdmin } from "../schemas";

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

export const ChallengeCard = ({
  challenge,
  onEdit,
}: {
  challenge: ChallengeAdmin;
  onEdit: (challenge: ChallengeAdmin) => void;
}) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-medium text-foreground">
        {challenge.badge.icon} {challenge.name}
      </p>
      <Button variant="outline" size="sm" onClick={() => onEdit(challenge)}>
        Edit
      </Button>
    </div>
    <p className="mt-1 text-xs text-muted-foreground">
      {formatDate(challenge.achievement.activeFrom)} –{" "}
      {formatDate(challenge.achievement.activeUntil)}
      {" · "}
      {challenge.badge.xpReward} XP
      {!challenge.isActive && " · hidden"}
      {!challenge.achievement.isActive && " · achievement paused"}
    </p>
  </div>
);
