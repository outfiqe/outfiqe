import { createUploadsApi } from "@outfiqe/api-client";

import { apiClient } from "./apiClient";

export const uploadsApi = createUploadsApi(apiClient);
