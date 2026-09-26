import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ActionRowSkeleton } from "@/components/ActionRowSkeleton";
import { usePlatformPermissions } from "@/features/auth/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { gamificationApi } from "../api";
import type { ActivityXpConfig } from "../schemas";
import { ActivityConfigCard } from "./ActivityConfigCard";
import { ACTIVITY_CONFIG_QUERY_KEY } from "./activityConfigForm.constants";
import { EditActivityConfigModal } from "./EditActivityConfigModal";

export const ActivityConfigSection = () => {
  const { canUse } = usePlatformPermissions();
  const canManageGamification = canUse(PLATFORM_MANAGE_PERMISSION.GAMIFICATION);
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
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => <ActionRowSkeleton key={index} hasSubLine />)}

        {configs?.map((config) => (
          <ActivityConfigCard
            key={config.activityType}
            config={config}
            onEdit={canManageGamification ? setEditingConfig : undefined}
          />
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
