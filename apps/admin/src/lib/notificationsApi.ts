import { createNotificationsApi } from "@outfiqe/client";
import { NotificationFeedScope } from "@outfiqe/types";

import { apiClient } from "./apiClient";
import { isOnTenantHost } from "./tenantHost";

export const notificationsApi = createNotificationsApi(apiClient, {
  scope: isOnTenantHost() ? NotificationFeedScope.TENANT : NotificationFeedScope.ALL,
});
