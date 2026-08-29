import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePermission, resolveTenant } from "#modules/crm-access/crm-access.middleware.js";
import { requireAdvancedCrmFeatures } from "#modules/crm-billing/crm-billing.middleware.js";

import { crmTicketsController } from "./crm-tickets.controller.js";
import {
  addCommentSchema,
  assignTicketSchema,
  changeStatusSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamsSchema,
} from "./crm-tickets.schemas.js";

const TICKETS_READ = "tickets:read";
const TICKETS_WRITE = "tickets:write";
const TICKETS_MANAGE = "tickets:manage";

const tenantChain = [resolveTenant, requireAuth, requireAdvancedCrmFeatures] as const;

export const crmTicketsRoutes = Router();

crmTicketsRoutes.get(
  "/tickets",
  ...tenantChain,
  requirePermission(TICKETS_READ),
  validate({ query: listTicketsQuerySchema }),
  crmTicketsController.listTickets,
);
crmTicketsRoutes.post(
  "/tickets",
  ...tenantChain,
  requirePermission(TICKETS_WRITE),
  validate({ body: createTicketSchema }),
  crmTicketsController.createTicket,
);
crmTicketsRoutes.get(
  "/tickets/:ticketId",
  ...tenantChain,
  requirePermission(TICKETS_READ),
  validate({ params: ticketIdParamsSchema }),
  crmTicketsController.getTicket,
);
crmTicketsRoutes.patch(
  "/tickets/:ticketId/status",
  ...tenantChain,
  requirePermission(TICKETS_WRITE),
  validate({ params: ticketIdParamsSchema, body: changeStatusSchema }),
  crmTicketsController.changeStatus,
);
crmTicketsRoutes.patch(
  "/tickets/:ticketId/assignee",
  ...tenantChain,
  requirePermission(TICKETS_MANAGE),
  validate({ params: ticketIdParamsSchema, body: assignTicketSchema }),
  crmTicketsController.assign,
);
crmTicketsRoutes.post(
  "/tickets/:ticketId/comments",
  ...tenantChain,
  requirePermission(TICKETS_WRITE),
  validate({ params: ticketIdParamsSchema, body: addCommentSchema }),
  crmTicketsController.addComment,
);
