import { createNotificationsApi } from "@outfiqe/client";

import { apiClient } from "./apiClient";

export const notificationsApi = createNotificationsApi(apiClient);
