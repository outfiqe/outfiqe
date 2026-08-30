import { z } from "zod";

import { MAX_SEARCH_QUERY_LENGTH, MIN_SEARCH_QUERY_LENGTH } from "./crm-reporting.constants.js";

export const crmSearchQuerySchema = z.object({
  q: z.string().trim().min(MIN_SEARCH_QUERY_LENGTH).max(MAX_SEARCH_QUERY_LENGTH),
});

export type CrmSearchQuery = z.infer<typeof crmSearchQuerySchema>;
