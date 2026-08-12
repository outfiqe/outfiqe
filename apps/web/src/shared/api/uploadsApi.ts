import { createUploadsApi } from "@outfiqe/client";

import { apiClient } from "@/shared/lib/apiClient";

export const uploadsApi = createUploadsApi(apiClient);
