import { createUploadsApi } from "@outfiqe/api-client";

import { apiClient } from "@/shared/lib/apiClient";

export const uploadsApi = createUploadsApi(apiClient);
