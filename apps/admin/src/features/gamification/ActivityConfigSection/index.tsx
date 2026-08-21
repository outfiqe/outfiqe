import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { gamificationApi } from "../api";
import type { ActivityXpConfig } from "../schemas";
import { ActivityConfigCard } from "./ActivityConfigCard";
import { ACTIVITY_CONFIG_QUERY_KEY } from "./activityConfigForm.constants";
import { EditActivityConfigModal } from "./EditActivityConfigModal";

export const ActivityConfigSection = () => {
  const { data: configs, isLoading } = useQuery({
    queryKey: ACTIVITY_CONFIG_QUERY_KEY,
    queryFn: gamificationApi.listActivityConfigs,
  });
  const [editingConfig, setEditingConfig] = useState<ActivityXpConfig | null>(null);

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Activity XP</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        How much XP each platform activity awards, and the anti-abuse limits on it.
      </p>

      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {configs?.map((config) => (
          <ActivityConfigCard key={config.activityType} config={config} onEdit={setEditingConfig} />
        ))}
      </div>

      {editingConfig && (
        <EditActivityConfigModal
          key={editingConfig.activityType}
          config={editingConfig}
          onClose={() => setEditingConfig(null)}
        />
      )}
    </div>
  );
};
