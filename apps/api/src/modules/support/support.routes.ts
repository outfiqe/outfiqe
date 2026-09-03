import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";

import { SUPPORT_PERMISSION } from "./support.constants.js";
import { supportController } from "./support.controller.js";
import { supportCreateRateLimit, supportReplyRateLimit } from "./support.rate-limit.js";
import {
  adminAssignSchema,
  adminChangeStatusSchema,
  adminListQuerySchema,
  adminPrioritySchema,
  adminReplySchema,
  createSupportTicketSchema,
  mineListQuerySchema,
  reopenTokenParamsSchema,
  requesterReplySchema,
  ticketIdParamsSchema,
} from "./support.schemas.js";

export const supportRoutes = Router();

supportRoutes.post(
  "/tickets",
  requireAuth,
  validate({ body: createSupportTicketSchema }),
  supportCreateRateLimit,
  supportController.createTicket,
);

supportRoutes.get(
  "/tickets/mine",
  requireAuth,
  validate({ query: mineListQuerySchema }),
  supportController.listMine,
);

supportRoutes.get(
  "/tickets/mine/:id",
  requireAuth,
  validate({ params: ticketIdParamsSchema }),
  supportController.getMine,
);

supportRoutes.post(
  "/tickets/mine/:id/messages",
  requireAuth,
  validate({ params: ticketIdParamsSchema, body: requesterReplySchema }),
  supportReplyRateLimit,
  supportController.replyMine,
);

supportRoutes.post(
  "/reopen/:token",
  validate({ params: reopenTokenParamsSchema }),
  supportController.reopen,
);

supportRoutes.get(
  "/admin/tickets",
  ...requirePlatformRole(SUPPORT_PERMISSION.READ),
  validate({ query: adminListQuerySchema }),
  supportController.adminList,
);

supportRoutes.get(
  "/admin/tickets/:id",
  ...requirePlatformRole(SUPPORT_PERMISSION.READ),
  validate({ params: ticketIdParamsSchema }),
  supportController.adminGet,
);

supportRoutes.post(
  "/admin/tickets/:id/messages",
  ...requirePlatformRole(SUPPORT_PERMISSION.RESPOND),
  validate({ params: ticketIdParamsSchema, body: adminReplySchema }),
  supportController.adminReply,
);

supportRoutes.patch(
  "/admin/tickets/:id/status",
  ...requirePlatformRole(SUPPORT_PERMISSION.RESPOND),
  validate({ params: ticketIdParamsSchema, body: adminChangeStatusSchema }),
  supportController.adminChangeStatus,
);

supportRoutes.patch(
  "/admin/tickets/:id/assignee",
  ...requirePlatformRole(SUPPORT_PERMISSION.RESPOND),
  validate({ params: ticketIdParamsSchema, body: adminAssignSchema }),
  supportController.adminAssign,
);

supportRoutes.patch(
  "/admin/tickets/:id/priority",
  ...requirePlatformRole(SUPPORT_PERMISSION.RESPOND),
  validate({ params: ticketIdParamsSchema, body: adminPrioritySchema }),
  supportController.adminSetPriority,
);

supportRoutes.get(
  "/admin/stats",
  ...requirePlatformRole(SUPPORT_PERMISSION.MANAGE),
  supportController.adminStats,
);

supportRoutes.get(
  "/admin/agents",
  ...requirePlatformRole(SUPPORT_PERMISSION.READ),
  supportController.adminAgents,
);
