import type { NotificationsApi } from "@outfiqe/client";
import { Checkbox, Skeleton } from "@outfiqe/design-system";
import { useNotificationPreferences } from "@outfiqe/hooks";

import { NOTIFICATION_TYPE_LABELS } from "./notificationTypeLabels";

const SKELETON_ROW_COUNT = 4;

type NotificationPreferencesViewProps = {
  notificationsApi: NotificationsApi;
  showPushChannel?: boolean;
};

export const NotificationPreferencesView = ({
  notificationsApi,
  showPushChannel = false,
}: NotificationPreferencesViewProps) => {
  const { preferences, isLoading, setPreference } = useNotificationPreferences(notificationsApi);

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto p-2">
      {showPushChannel && (
        <div className="flex items-center justify-end gap-6 px-2 pb-1 pr-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>In app</span>
          <span>Phone</span>
        </div>
      )}
      <ul>
        {preferences.map((preference) => {
          const inAppInputId = `notification-preference-${preference.type}`;
          const pushInputId = `notification-push-preference-${preference.type}`;
          const label = NOTIFICATION_TYPE_LABELS[preference.type];

          return (
            <li key={preference.type} className="flex items-center justify-between gap-3 px-2 py-2">
              <label htmlFor={inAppInputId} className="text-sm text-foreground">
                {label}
              </label>
              <div className="flex shrink-0 items-center gap-6">
                <Checkbox
                  id={inAppInputId}
                  checked={preference.enabled}
                  onChange={(event) =>
                    setPreference(preference.type, { enabled: event.target.checked })
                  }
                />
                {showPushChannel && (
                  <Checkbox
                    id={pushInputId}
                    aria-label={`${label} on my phone`}
                    checked={preference.pushEnabled}
                    disabled={!preference.enabled}
                    onChange={(event) =>
                      setPreference(preference.type, { pushEnabled: event.target.checked })
                    }
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
