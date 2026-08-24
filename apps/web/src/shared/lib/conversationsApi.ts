import { createConversationsApi } from "@outfiqe/client";

import { apiClient } from "./apiClient";

export const conversationsApi = createConversationsApi(apiClient);
