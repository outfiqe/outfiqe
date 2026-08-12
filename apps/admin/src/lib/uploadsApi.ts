import { createUploadsApi } from "@outfiqe/client";

import { apiClient } from "./apiClient";

export const uploadsApi = createUploadsApi(apiClient);
