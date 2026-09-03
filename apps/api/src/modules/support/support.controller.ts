import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";
import { getPlatformPrincipal } from "#modules/platform-access/platform-access.middleware.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { SUPPORT_PERMISSION } from "./support.constants.js";
import type {
  AdminAssignBody,
  AdminChangeStatusBody,
  AdminListQuery,
  AdminPriorityBody,
  AdminReplyBody,
  CreateSupportTicketBody,
  MineListQuery,
  ReopenTokenParams,
  RequesterReplyBody,
  TicketIdParams,
} from "./support.schemas.js";
import { supportService } from "./support.service.js";

const CREATED_STATUS = 201;
const SUPPORT_AUDIT_TARGET = "support-ticket";

const requestContext = (req: Request) => ({
  sourceIp: req.ip ?? null,
  userAgent: req.get("user-agent") ?? null,
});

export const supportController = {
  async createTicket(req: Request, res: Response) {
    const principal = requireAuthPrincipal(res);
    const body = validated.body<CreateSupportTicketBody>(res);
    const ticket = await supportService.createTicket(principal.userId, body, requestContext(req));
    sendSuccess(
      res,
      { reference: ticket.reference, id: ticket.id },
      "Request submitted.",
      CREATED_STATUS,
    );
  },

  async listMine(_req: Request, res: Response) {
    const principal = requireAuthPrincipal(res);
    const query = validated.query<MineListQuery>(res);
    sendSuccess(
      res,
      await supportService.listMine(principal.userId, query),
      "Your support requests.",
    );
  },

  async getMine(_req: Request, res: Response) {
    const principal = requireAuthPrincipal(res);
    const { id } = validated.params<TicketIdParams>(res);
    sendSuccess(res, await supportService.getMine(principal.userId, id), "Support request.");
  },

  async replyMine(_req: Request, res: Response) {
    const principal = requireAuthPrincipal(res);
    const { id } = validated.params<TicketIdParams>(res);
    const { body, attachmentUrls } = validated.body<RequesterReplyBody>(res);
    sendSuccess(
      res,
      await supportService.requesterReply(principal.userId, id, body, attachmentUrls),
      "Reply sent.",
      CREATED_STATUS,
    );
  },

  async reopen(_req: Request, res: Response) {
    const { token } = validated.params<ReopenTokenParams>(res);
    sendSuccess(res, await supportService.reopenByToken(token), "Request reopened.");
  },

  async adminList(_req: Request, res: Response) {
    const query = validated.query<AdminListQuery>(res);
    sendSuccess(res, await supportService.listForAdmin(query), "Support requests.");
  },

  async adminGet(_req: Request, res: Response) {
    const { id } = validated.params<TicketIdParams>(res);
    sendSuccess(res, await supportService.getForAdmin(id), "Support request.");
  },

  async adminReply(_req: Request, res: Response) {
    const { actorUserId } = getPlatformPrincipal(res);
    const { id } = validated.params<TicketIdParams>(res);
    const body = validated.body<AdminReplyBody>(res);
    const ticket = await supportService.adminReply(actorUserId, id, body);

    await platformAudit.record({
      actorUserId,
      action: "support.ticket.replied",
      summary: `Posted a ${body.visibility.toLowerCase()} message on ${ticket.reference}`,
      targetType: SUPPORT_AUDIT_TARGET,
      targetId: id,
    });

    sendSuccess(res, ticket, "Reply posted.", CREATED_STATUS);
  },

  async adminChangeStatus(_req: Request, res: Response) {
    const { actorUserId } = getPlatformPrincipal(res);
    const { id } = validated.params<TicketIdParams>(res);
    const body = validated.body<AdminChangeStatusBody>(res);
    const ticket = await supportService.changeStatus(id, body);

    await platformAudit.record({
      actorUserId,
      action: "support.ticket.status_changed",
      summary: `Moved ${ticket.reference} to ${body.status.toLowerCase()}`,
      targetType: SUPPORT_AUDIT_TARGET,
      targetId: id,
    });

    sendSuccess(res, ticket, "Status updated.");
  },

  async adminAssign(_req: Request, res: Response) {
    const { actorUserId, permissionKeys } = getPlatformPrincipal(res);
    const { id } = validated.params<TicketIdParams>(res);
    const { assigneeUserId } = validated.body<AdminAssignBody>(res);
    const canManageOthers = permissionKeys.includes(SUPPORT_PERMISSION.MANAGE);
    const ticket = await supportService.assign(actorUserId, id, assigneeUserId, canManageOthers);

    await platformAudit.record({
      actorUserId,
      action: "support.ticket.assigned",
      summary: assigneeUserId
        ? `Assigned ${ticket.reference} to ${ticket.assigneeName ?? assigneeUserId}`
        : `Unassigned ${ticket.reference}`,
      targetType: SUPPORT_AUDIT_TARGET,
      targetId: id,
    });

    sendSuccess(res, ticket, "Assignee updated.");
  },

  async adminSetPriority(_req: Request, res: Response) {
    const { actorUserId } = getPlatformPrincipal(res);
    const { id } = validated.params<TicketIdParams>(res);
    const { priority } = validated.body<AdminPriorityBody>(res);
    const ticket = await supportService.setPriority(id, priority);

    await platformAudit.record({
      actorUserId,
      action: "support.ticket.priority_changed",
      summary: `Set ${ticket.reference} priority to ${priority.toLowerCase()}`,
      targetType: SUPPORT_AUDIT_TARGET,
      targetId: id,
    });

    sendSuccess(res, ticket, "Priority updated.");
  },

  async adminStats(_req: Request, res: Response) {
    sendSuccess(res, await supportService.stats(), "Support inbox stats.");
  },

  async adminAgents(_req: Request, res: Response) {
    sendSuccess(res, await supportService.listAgents(), "Support agents.");
  },
};
