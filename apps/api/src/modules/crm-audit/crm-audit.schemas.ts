import { z } from "zod";

import { CrmAuditAction } from "#generated/prisma/enums.js";

import {
  AUDIT_ACTION_GROUPS,
  type AuditActionGroup,
  DEFAULT_AUDIT_PAGE_SIZE,
  MAX_AUDIT_PAGE_SIZE,
} from "./crm-audit.constants.js";

const AUDIT_GROUP_NAMES = Object.keys(AUDIT_ACTION_GROUPS) as [
  AuditActionGroup,
  ...AuditActionGroup[],
];

const auditFilterShape = {
  action: z.enum(CrmAuditAction).optional(),
  group: z.enum(AUDIT_GROUP_NAMES).optional(),
  actorUserId: z.uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
};

const hasOrderedDates = ({ from, to }: { from?: Date; to?: Date }) => !from || !to || from <= to;
const ORDERED_DATES_MESSAGE = { message: "The start date must be on or before the end date." };

export const listAuditQuerySchema = z
  .object({
    ...auditFilterShape,
    cursor: z.uuid().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_AUDIT_PAGE_SIZE)
      .optional()
      .default(DEFAULT_AUDIT_PAGE_SIZE),
  })
  .refine(hasOrderedDates, ORDERED_DATES_MESSAGE);

export const exportAuditQuerySchema = z
  .object(auditFilterShape)
  .refine(hasOrderedDates, ORDERED_DATES_MESSAGE);

export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;
export type ExportAuditQuery = z.infer<typeof exportAuditQuerySchema>;
