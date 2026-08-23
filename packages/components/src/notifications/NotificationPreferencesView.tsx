import type { NotificationsApi } from "@outfiqe/client";
import { Checkbox, Skeleton } from "@outfiqe/design-system";
import { useNotificationPreferences } from "@outfiqe/hooks";

import { NOTIFICATION_TYPE_LABELS } from "./notificationTypeLabels";

type NotificationPreferencesViewProps = {
  notificationsApi: NotificationsApi;
};

export const NotificationPreferencesView = ({
  notificationsApi,
}: NotificationPreferencesViewProps) => {
  const { preferences, isLoading, setPreference } = useNotificationPreferences(notificationsApi);

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <ul className="max-h-80 overflow-y-auto p-2">
      {preferences.map((preference) => {
        const inputId = `notification-preference-${preference.type}`;
        return (
          <li key={preference.type} className="flex items-center justify-between gap-3 px-2 py-2">
            <label htmlFor={inputId} className="text-sm text-foreground">
              {NOTIFICATION_TYPE_LABELS[preference.type]}
            </label>
            <Checkbox
              id={inputId}
              checked={preference.enabled}
              onChange={(event) => setPreference(preference.type, event.target.checked)}
            />
          </li>
        );
      })}
    </ul>
  );
};
