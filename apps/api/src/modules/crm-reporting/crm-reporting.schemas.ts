import { z } from "zod";

import {
  CRM_SEARCH_ENTITY,
  MAX_SEARCH_QUERY_LENGTH,
  MIN_SEARCH_QUERY_LENGTH,
} from "./crm-reporting.constants.js";

const CRM_SEARCH_ENTITY_VALUES = Object.values(CRM_SEARCH_ENTITY);

export const crmSearchQuerySchema = z.object({
  q: z.string().trim().min(MIN_SEARCH_QUERY_LENGTH).max(MAX_SEARCH_QUERY_LENGTH),
});

export const crmConnectionsQuerySchema = z.object({
  subjectType: z.enum(CRM_SEARCH_ENTITY_VALUES),
  subjectId: z.uuid(),
});

export type CrmSearchQuery = z.infer<typeof crmSearchQuerySchema>;
export type CrmConnectionsQuery = z.infer<typeof crmConnectionsQuerySchema>;
