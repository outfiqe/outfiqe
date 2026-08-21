import { Button } from "@outfiqe/design-system";

import type { ActivityXpConfig } from "../schemas";

export const ActivityConfigCard = ({
  config,
  onEdit,
}: {
  config: ActivityXpConfig;
  onEdit: (config: ActivityXpConfig) => void;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
    <div>
      <p className="text-sm font-medium text-foreground">
        {config.activityType}
        {!config.enabled && <span className="ml-2 text-xs text-muted-foreground">(disabled)</span>}
      </p>
      <p className="text-xs text-muted-foreground">
        {config.xpAmount} XP
        {config.dailyLimit !== null && ` · daily cap ${config.dailyLimit}`}
        {config.cooldownSeconds !== null && ` · ${config.cooldownSeconds}s cooldown`}
        {config.maxPerEntity !== null && ` · max ${config.maxPerEntity}/entity`}
      </p>
    </div>
    <Button variant="outline" size="sm" onClick={() => onEdit(config)}>
      Edit
    </Button>
  </div>
);
