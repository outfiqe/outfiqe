import { createChatApi } from "@outfiqe/client";

import { apiClient } from "./apiClient";

export const chatApi = createChatApi(apiClient);
